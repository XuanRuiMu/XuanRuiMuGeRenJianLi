import { 环形缓冲实例 } from './全局'
import { 日志分类 } from './环形缓冲'
import type { 错误分类, 错误报告, 日志上下文 } from './类型'
import { 解析可信上报端点 } from './上报端点校验'

const CATEGORY_MAP: Record<错误分类, 日志分类> = {
  render: 日志分类.Render,
  runtime: 日志分类.Runtime,
  network: 日志分类.Network,
  webgl: 日志分类.WebGL,
  webgpu: 日志分类.WebGL,
  audio: 日志分类.Audio,
  unknown: 日志分类.Unknown,
  logic: 日志分类.Unknown,
  dependency: 日志分类.Unknown,
}

function 分类错误(error: Error): 错误分类 {
  const message = error.message?.toLowerCase() ?? ''
  const stack = error.stack?.toLowerCase() ?? ''

  if (message.includes('webgpu') || stack.includes('webgpu')) return 'webgpu'
  if (message.includes('webgl') || stack.includes('webgl') || message.includes('shader')) return 'webgl'
  if (message.includes('network') || message.includes('fetch') || message.includes('load')) return 'network'
  if (message.includes('audio') || stack.includes('audiocontext') || stack.includes('audio')) return 'audio'
  if (message.includes('react') || stack.includes('react')) return 'render'
  if (message.includes('cannot find module') || message.includes('import') || message.includes('module'))
    return 'dependency'
  return 'unknown'
}

function generateErrorId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** 日志安全：URL 只保留源+路径，query/hash 可能带令牌等敏感参数，一律剥离 */
function 安全URL(): string {
  if (typeof window === 'undefined') return ''
  const { origin, pathname } = window.location
  return `${origin}${pathname}`
}

function buildReport(
  error: Error,
  category: 错误分类 = 'unknown',
  componentStack?: string,
  context?: 日志上下文
): 错误报告 {
  return {
    id: generateErrorId(),
    timestamp: new Date().toISOString(),
    category,
    message: error.message,
    stack: error.stack,
    componentStack,
    context,
    url: 安全URL(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    sessionId: 'ringbuf-01',
  }
}

class 错误上报器 {
  private reported = new Set<string>()
  private maxReports = 10

  report(
    error: Error | unknown,
    options?: { category?: 错误分类; componentStack?: string; context?: 日志上下文 }
  ): 错误报告 | null {
    if (!(error instanceof Error)) {
      return this.report(new Error(String(error)), options)
    }

    const category = options?.category ?? 分类错误(error)
    const report = buildReport(error, category, options?.componentStack, options?.context)

    if (this.reported.has(report.id)) return report
    if (this.reported.size >= this.maxReports) {
      环形缓冲实例.write('warn', 日志分类.Runtime, 'Error report quota exceeded', { category })
      return report
    }
    this.reported.add(report.id)

    const catNum = CATEGORY_MAP[category] ?? 日志分类.Unknown
    环形缓冲实例.write('error', catNum, `[${category}] ${report.message}`, {
      errorId: report.id,
      category: report.category,
      url: report.url,
      ...report.context,
    })

    if (import.meta.env.PROD) {
      this.send(report).catch(() => {
        环形缓冲实例.write('warn', 日志分类.Runtime, 'Failed to send error report', { errorId: report.id })
      })
    }

    return report
  }

  private async send(report: 错误报告): Promise<void> {
    const 原始端点 = import.meta.env.VITE_ERROR_REPORT_ENDPOINT
    const endpoint = 解析可信上报端点(原始端点)
    if (!endpoint) {
      // 未配置或配置不信任（http 明文 / 协议相对 / 任意协议）：不外发，仅留痕
      if (原始端点) 环形缓冲实例.write('warn', 日志分类.Runtime, '错误上报端点不信任，已跳过外发')
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 5000)

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
        signal: controller.signal,
        keepalive: true,
      })
    } finally {
      window.clearTimeout(timeout)
    }
  }
}

export const 错误上报器实例 = new 错误上报器()

export { 分类错误 }

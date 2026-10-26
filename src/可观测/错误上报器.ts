import { 环形缓冲实例 } from './全局'
import { 日志分类 } from './环形缓冲'
import type { 错误分类, 错误报告, 日志上下文 } from './类型'
import { 解析可信上报端点 } from './上报端点校验'

const 分类映射表: Record<错误分类, 日志分类> = {
  render: 日志分类.渲染分类,
  runtime: 日志分类.运行时分类,
  network: 日志分类.网络分类,
  webgl: 日志分类.三维渲染分类,
  webgpu: 日志分类.三维渲染分类,
  audio: 日志分类.音频分类,
  unknown: 日志分类.未知分类,
  logic: 日志分类.未知分类,
  dependency: 日志分类.未知分类,
}

function 分类错误(错误: Error): 错误分类 {
  const 消息 = 错误.message?.toLowerCase() ?? ''
  const 栈 = 错误.stack?.toLowerCase() ?? ''

  if (消息.includes('webgpu') || 栈.includes('webgpu')) return 'webgpu'
  if (消息.includes('webgl') || 栈.includes('webgl') || 消息.includes('shader')) return 'webgl'
  if (消息.includes('network') || 消息.includes('fetch') || 消息.includes('load')) return 'network'
  if (消息.includes('audio') || 栈.includes('audiocontext') || 栈.includes('audio')) return 'audio'
  if (消息.includes('react') || 栈.includes('react')) return 'render'
  if (消息.includes('cannot find module') || 消息.includes('import') || 消息.includes('module')) return 'dependency'
  return 'unknown'
}

function 生成错误编号(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function 安全URL(): string {
  if (typeof window === 'undefined') return ''
  const { origin, pathname } = window.location
  return `${origin}${pathname}`
}

function 构建报告(错误: Error, 分类: 错误分类 = 'unknown', componentStack?: string, 上下文?: 日志上下文): 错误报告 {
  return {
    id: 生成错误编号(),
    timestamp: new Date().toISOString(),
    category: 分类,
    message: 错误.message,
    stack: 错误.stack,
    componentStack,
    context: 上下文,
    url: 安全URL(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    sessionId: 'ringbuf-01',
  }
}

class 错误上报器 {
  private 已上报 = new Set<string>()
  private 最大报告数 = 10

  报告(
    错误: Error | unknown,
    选项?: { category?: 错误分类; componentStack?: string; context?: 日志上下文 }
  ): 错误报告 | null {
    if (!(错误 instanceof Error)) {
      return this.报告(new Error(String(错误)), 选项)
    }

    const 分类 = 选项?.category ?? 分类错误(错误)
    const 报告 = 构建报告(错误, 分类, 选项?.componentStack, 选项?.context)

    if (this.已上报.has(报告.id)) return 报告
    if (this.已上报.size >= this.最大报告数) {
      环形缓冲实例.写入('warn', 日志分类.运行时分类, 'Error report quota exceeded', { category: 分类 })
      return 报告
    }
    this.已上报.add(报告.id)

    const 分类编号值 = 分类映射表[分类] ?? 日志分类.未知分类
    环形缓冲实例.写入('error', 分类编号值, `[${分类}] ${报告.message}`, {
      errorId: 报告.id,
      category: 报告.category,
      url: 报告.url,
      ...报告.context,
    })

    if (import.meta.env.PROD) {
      this.send(报告).catch(() => {
        环形缓冲实例.写入('warn', 日志分类.运行时分类, 'Failed to send error report', { errorId: 报告.id })
      })
    }

    return 报告
  }

  private async send(报告: 错误报告): Promise<void> {
    const 原始端点 = import.meta.env.VITE_ERROR_REPORT_ENDPOINT
    const 端点 = 解析可信上报端点(原始端点)
    if (!端点) {
      if (原始端点) 环形缓冲实例.写入('warn', 日志分类.运行时分类, '错误上报端点不信任，已跳过外发')
      return
    }

    const 控制器 = new AbortController()
    const 超时 = window.setTimeout(() => 控制器.abort(), 5000)

    try {
      await fetch(端点, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(报告),
        signal: 控制器.signal,
        keepalive: true,
      })
    } finally {
      window.clearTimeout(超时)
    }
  }
}

export const 错误上报器实例 = new 错误上报器()

export { 分类错误 }

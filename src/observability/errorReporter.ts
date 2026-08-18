import { ringBuffer } from './globals'
import { LogCategory } from './ringBuffer'
import type { ErrorCategory, ErrorReport, LogContext } from './types'

const CATEGORY_MAP: Record<ErrorCategory, LogCategory> = {
  render: LogCategory.Render,
  runtime: LogCategory.Runtime,
  network: LogCategory.Network,
  webgl: LogCategory.WebGL,
  webgpu: LogCategory.WebGL,
  audio: LogCategory.Audio,
  unknown: LogCategory.Unknown,
  logic: LogCategory.Unknown,
  dependency: LogCategory.Unknown,
}

function classifyError(error: Error): ErrorCategory {
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

function buildReport(
  error: Error,
  category: ErrorCategory = 'unknown',
  componentStack?: string,
  context?: LogContext
): ErrorReport {
  return {
    id: generateErrorId(),
    timestamp: new Date().toISOString(),
    category,
    message: error.message,
    stack: error.stack,
    componentStack,
    context,
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    sessionId: 'ringbuf-01',
  }
}

class ErrorReporter {
  private reported = new Set<string>()
  private maxReports = 10

  report(
    error: Error | unknown,
    options?: { category?: ErrorCategory; componentStack?: string; context?: LogContext }
  ): ErrorReport | null {
    if (!(error instanceof Error)) {
      return this.report(new Error(String(error)), options)
    }

    const category = options?.category ?? classifyError(error)
    const report = buildReport(error, category, options?.componentStack, options?.context)

    if (this.reported.has(report.id)) return report
    if (this.reported.size >= this.maxReports) {
      ringBuffer.write('warn', LogCategory.Runtime, 'Error report quota exceeded', { category })
      return report
    }
    this.reported.add(report.id)

    const catNum = CATEGORY_MAP[category] ?? LogCategory.Unknown
    ringBuffer.write('error', catNum, `[${category}] ${report.message}`, {
      errorId: report.id,
      category: report.category,
      url: report.url,
      ...report.context,
    })

    if (import.meta.env.PROD) {
      this.send(report).catch(() => {
        ringBuffer.write('warn', LogCategory.Runtime, 'Failed to send error report', { errorId: report.id })
      })
    }

    return report
  }

  private async send(report: ErrorReport): Promise<void> {
    const endpoint = import.meta.env.VITE_ERROR_REPORT_ENDPOINT
    if (!endpoint) return

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

export const errorReporter = new ErrorReporter()

export { classifyError }

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export type ErrorCategory =
  'render' | 'runtime' | 'network' | 'webgl' | 'webgpu' | 'audio' | 'unknown' | 'logic' | 'dependency'

export interface LogContext {
  [key: string]: unknown
}

export interface StructuredLogEntry {
  timestamp: string
  level: LogLevel
  message: string
  category?: string
  context?: LogContext
  sessionId: string
}

export interface ErrorReport {
  id: string
  timestamp: string
  category: ErrorCategory
  message: string
  stack?: string
  componentStack?: string
  context?: LogContext
  url: string
  userAgent: string
  sessionId: string
}

export interface TelemetryCollector {
  log(level: LogLevel, message: string, context?: LogContext): void
  report(error: ErrorReport): void
}

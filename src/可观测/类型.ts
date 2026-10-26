export type 日志级别 = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export type 错误分类 =
  'render' | 'runtime' | 'network' | 'webgl' | 'webgpu' | 'audio' | 'unknown' | 'logic' | 'dependency'

export interface 日志上下文 {
  [key: string]: unknown
}

export interface 结构化日志条目 {
  timestamp: string
  level: 日志级别
  message: string
  category?: string
  context?: 日志上下文
  sessionId: string
}

export interface 错误报告 {
  id: string
  timestamp: string
  category: 错误分类
  message: string
  stack?: string
  componentStack?: string
  context?: 日志上下文
  url: string
  userAgent: string
  sessionId: string
}

export interface 遥测收集器 {
  log(级别: 日志级别, 消息: string, 上下文?: 日志上下文): void
  report(错误: 错误报告): void
}

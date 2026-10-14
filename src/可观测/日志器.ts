import { 环形缓冲实例 } from './全局'
import type { 日志上下文 } from './类型'

export const 日志器实例 = {
  debug(message: string, context?: 日志上下文) {
    环形缓冲实例.write('debug', 1, message, context)
  },
  info(message: string, context?: 日志上下文) {
    环形缓冲实例.write('info', 1, message, context)
  },
  warn(message: string, context?: 日志上下文) {
    环形缓冲实例.write('warn', 1, message, context)
  },
  error(message: string, context?: 日志上下文) {
    环形缓冲实例.write('error', 1, message, context)
  },
  fatal(message: string, context?: 日志上下文) {
    环形缓冲实例.write('fatal', 1, message, context)
  },
  getSessionId(): string {
    return 'ringbuf-01'
  },
  registerCollector() {},
}

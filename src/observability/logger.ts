import { ringBuffer } from './globals'
import type { LogContext } from './types'

export const logger = {
  debug(message: string, context?: LogContext) {
    ringBuffer.write('debug', 1, message, context)
  },
  info(message: string, context?: LogContext) {
    ringBuffer.write('info', 1, message, context)
  },
  warn(message: string, context?: LogContext) {
    ringBuffer.write('warn', 1, message, context)
  },
  error(message: string, context?: LogContext) {
    ringBuffer.write('error', 1, message, context)
  },
  fatal(message: string, context?: LogContext) {
    ringBuffer.write('fatal', 1, message, context)
  },
  getSessionId(): string {
    return 'ringbuf-01'
  },
  registerCollector() {},
}

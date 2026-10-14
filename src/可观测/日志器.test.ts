import { describe, it, expect, beforeEach } from 'vitest'
import { 日志器实例 } from './日志器'
import { 环形缓冲实例 } from './全局'

describe('logger', () => {
  beforeEach(() => {
    环形缓冲实例.clear()
  })

  it('should generate a session id', () => {
    const sessionId = 日志器实例.getSessionId()
    expect(sessionId).toBeTruthy()
    expect(typeof sessionId).toBe('string')
  })

  it('should write info logs to ringBuffer', () => {
    日志器实例.info('test message', { key: 'value' })
    const entries = 环形缓冲实例.read()
    expect(entries).toHaveLength(1)
    expect(entries[0].message).toBe('test message')
    expect(entries[0].level).toBe('info')
    expect(entries[0].context?.key).toBe('value')
  })

  it('should support all levels without throwing', () => {
    expect(() => 日志器实例.debug('d')).not.toThrow()
    expect(() => 日志器实例.info('i')).not.toThrow()
    expect(() => 日志器实例.warn('w')).not.toThrow()
    expect(() => 日志器实例.error('e')).not.toThrow()
    expect(() => 日志器实例.fatal('f')).not.toThrow()
    const entries = 环形缓冲实例.read()
    expect(entries).toHaveLength(5)
  })
})

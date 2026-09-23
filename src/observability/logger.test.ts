import { describe, it, expect, beforeEach } from 'vitest'
import { logger } from './logger'
import { ringBuffer } from './globals'

describe('logger', () => {
  beforeEach(() => {
    ringBuffer.clear()
  })

  it('should generate a session id', () => {
    const sessionId = logger.getSessionId()
    expect(sessionId).toBeTruthy()
    expect(typeof sessionId).toBe('string')
  })

  it('should write info logs to ringBuffer', () => {
    logger.info('test message', { key: 'value' })
    const entries = ringBuffer.read()
    expect(entries).toHaveLength(1)
    expect(entries[0].message).toBe('test message')
    expect(entries[0].level).toBe('info')
    expect(entries[0].context?.key).toBe('value')
  })

  it('should support all levels without throwing', () => {
    expect(() => logger.debug('d')).not.toThrow()
    expect(() => logger.info('i')).not.toThrow()
    expect(() => logger.warn('w')).not.toThrow()
    expect(() => logger.error('e')).not.toThrow()
    expect(() => logger.fatal('f')).not.toThrow()
    const entries = ringBuffer.read()
    expect(entries).toHaveLength(5)
  })
})

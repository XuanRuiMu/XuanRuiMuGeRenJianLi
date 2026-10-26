import { describe, it, expect, beforeEach } from 'vitest'
import { 日志器实例 } from './日志器'
import { 环形缓冲实例 } from './全局'

describe('logger', () => {
  beforeEach(() => {
    环形缓冲实例.清空()
  })

  it('should generate a session id', () => {
    const 会话编号 = 日志器实例.获取会话编号()
    expect(会话编号).toBeTruthy()
    expect(typeof 会话编号).toBe('string')
  })

  it('should write info logs to ringBuffer', () => {
    日志器实例.信息('test message', { key: 'value' })
    const 条目表 = 环形缓冲实例.读取()
    expect(条目表).toHaveLength(1)
    expect(条目表[0].message).toBe('test message')
    expect(条目表[0].level).toBe('info')
    expect(条目表[0].context?.key).toBe('value')
  })

  it('should support all levels without throwing', () => {
    expect(() => 日志器实例.debug('d')).not.toThrow()
    expect(() => 日志器实例.信息('i')).not.toThrow()
    expect(() => 日志器实例.warn('w')).not.toThrow()
    expect(() => 日志器实例.错误('e')).not.toThrow()
    expect(() => 日志器实例.致命('f')).not.toThrow()
    const 条目表 = 环形缓冲实例.读取()
    expect(条目表).toHaveLength(5)
  })
})

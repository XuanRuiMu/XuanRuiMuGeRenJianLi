import { describe, it, expect, beforeEach } from 'vitest'
import { 错误上报器实例, 分类错误 } from './错误上报器'
import { 环形缓冲实例 } from './全局'

describe('errorReporter', () => {
  beforeEach(() => {
    环形缓冲实例.clear()
  })

  it('should classify webgl errors', () => {
    expect(分类错误(new Error('WebGL context lost'))).toBe('webgl')
  })

  it('should classify webgpu errors', () => {
    expect(分类错误(new Error('WebGPU adapter not available'))).toBe('webgpu')
  })

  it('should classify network errors', () => {
    expect(分类错误(new Error('network request failed'))).toBe('network')
  })

  it('should report errors with unique ids', () => {
    const report1 = 错误上报器实例.report(new Error('first'))
    const report2 = 错误上报器实例.report(new Error('second'))
    expect(report1?.id).not.toBe(report2?.id)
  })

  it('should handle non-error values', () => {
    const report = 错误上报器实例.report('string error')
    expect(report).not.toBeNull()
    expect(report?.message).toBe('string error')
  })

  it('should write error entries to ringBuffer', () => {
    错误上报器实例.report(new Error('test error'))
    const entries = 环形缓冲实例.read()
    expect(entries.length).toBeGreaterThan(0)
    expect(entries.some((e) => e.message.includes('test error'))).toBe(true)
  })
})

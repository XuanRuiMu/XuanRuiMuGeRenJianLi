import { describe, it, expect, beforeEach } from 'vitest'
import { 错误上报器实例, 分类错误 } from './错误上报器'
import { 环形缓冲实例 } from './全局'

describe('errorReporter', () => {
  beforeEach(() => {
    环形缓冲实例.清空()
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
    const 报告一 = 错误上报器实例.报告(new Error('first'))
    const 报告二 = 错误上报器实例.报告(new Error('second'))
    expect(报告一?.id).not.toBe(报告二?.id)
  })

  it('should handle non-error values', () => {
    const 报告 = 错误上报器实例.报告('string error')
    expect(报告).not.toBeNull()
    expect(报告?.message).toBe('string error')
  })

  it('should write error entries to ringBuffer', () => {
    错误上报器实例.报告(new Error('test error'))
    const 条目表 = 环形缓冲实例.读取()
    expect(条目表.length).toBeGreaterThan(0)
    expect(条目表.some((e) => e.message.includes('test error'))).toBe(true)
  })
})

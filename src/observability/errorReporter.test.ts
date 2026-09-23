import { describe, it, expect, beforeEach } from 'vitest'
import { errorReporter, classifyError } from './errorReporter'
import { ringBuffer } from './globals'

describe('errorReporter', () => {
  beforeEach(() => {
    ringBuffer.clear()
  })

  it('should classify webgl errors', () => {
    expect(classifyError(new Error('WebGL context lost'))).toBe('webgl')
  })

  it('should classify webgpu errors', () => {
    expect(classifyError(new Error('WebGPU adapter not available'))).toBe('webgpu')
  })

  it('should classify network errors', () => {
    expect(classifyError(new Error('network request failed'))).toBe('network')
  })

  it('should report errors with unique ids', () => {
    const report1 = errorReporter.report(new Error('first'))
    const report2 = errorReporter.report(new Error('second'))
    expect(report1?.id).not.toBe(report2?.id)
  })

  it('should handle non-error values', () => {
    const report = errorReporter.report('string error')
    expect(report).not.toBeNull()
    expect(report?.message).toBe('string error')
  })

  it('should write error entries to ringBuffer', () => {
    errorReporter.report(new Error('test error'))
    const entries = ringBuffer.read()
    expect(entries.length).toBeGreaterThan(0)
    expect(entries.some((e) => e.message.includes('test error'))).toBe(true)
  })
})

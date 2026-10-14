import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useJianShaoDongHua } from './useJianShaoDongHua'

describe('useJianShaoDongHua', () => {
  let 匹配值 = false
  let 变更监听: ((event: { matches: boolean }) => void) | null = null

  beforeEach(() => {
    匹配值 = false
    变更监听 = null
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        get matches() {
          return 匹配值
        },
        addEventListener: (_event: string, cb: (event: { matches: boolean }) => void) => {
          变更监听 = cb
        },
        removeEventListener: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false by default', () => {
    const { result } = renderHook(() => useJianShaoDongHua())
    expect(result.current).toBe(false)
  })

  it('reacts to media query changes', () => {
    const { result } = renderHook(() => useJianShaoDongHua())
    expect(result.current).toBe(false)

    act(() => {
      if (变更监听) {
        变更监听({ matches: true })
      }
    })

    expect(result.current).toBe(true)
  })
})

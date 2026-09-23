import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReducedMotion } from './useReducedMotion'

describe('useReducedMotion', () => {
  let matches = false
  let changeListener: ((event: { matches: boolean }) => void) | null = null

  beforeEach(() => {
    matches = false
    changeListener = null
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        get matches() {
          return matches
        },
        addEventListener: (_event: string, cb: (event: { matches: boolean }) => void) => {
          changeListener = cb
        },
        removeEventListener: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false by default', () => {
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('reacts to media query changes', () => {
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)

    act(() => {
      if (changeListener) {
        changeListener({ matches: true })
      }
    })

    expect(result.current).toBe(true)
  })
})

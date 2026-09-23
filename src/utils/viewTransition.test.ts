import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isViewTransitionSupported, startViewTransition, startCircularRevealTransition } from './viewTransition'

describe('viewTransition', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      ...document,
      startViewTransition: undefined,
      documentElement: {
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
        },
        style: {
          setProperty: vi.fn(),
          removeProperty: vi.fn(),
        },
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('detects unsupported view transition', () => {
    expect(isViewTransitionSupported()).toBe(false)
  })

  it('falls back to callback when unsupported', async () => {
    const callback = vi.fn()
    await startViewTransition(callback)
    expect(callback).toHaveBeenCalled()
  })

  it('uses document.startViewTransition when available', async () => {
    const callback = vi.fn()
    const startViewTransitionMock = vi.fn((cb) => {
      cb()
      return {
        updateCallbackDone: Promise.resolve(),
        ready: Promise.resolve(),
        finished: Promise.resolve(),
      }
    })

    vi.stubGlobal('document', {
      ...document,
      startViewTransition: startViewTransitionMock,
    })

    await startViewTransition(callback)
    expect(startViewTransitionMock).toHaveBeenCalled()
    expect(callback).toHaveBeenCalled()
  })

  it('falls back to callback for circular reveal when unsupported', async () => {
    const callback = vi.fn()
    await startCircularRevealTransition(callback, { x: 100, y: 200 })
    expect(callback).toHaveBeenCalled()
  })

  it('applies circular reveal class and origin properties during transition', async () => {
    const callback = vi.fn()
    const classAdd = vi.fn()
    const classRemove = vi.fn()
    const setProperty = vi.fn()
    const removeProperty = vi.fn()
    const startViewTransitionMock = vi.fn((cb) => {
      cb()
      return {
        updateCallbackDone: Promise.resolve(),
        ready: Promise.resolve(),
        finished: Promise.resolve(),
      }
    })

    vi.stubGlobal('document', {
      ...document,
      startViewTransition: startViewTransitionMock,
      documentElement: {
        classList: { add: classAdd, remove: classRemove },
        style: { setProperty, removeProperty },
      },
    })

    await startCircularRevealTransition(callback, { x: 100, y: 200 })
    expect(startViewTransitionMock).toHaveBeenCalled()
    expect(classAdd).toHaveBeenCalledWith('circular-reveal-active')
    expect(setProperty).toHaveBeenCalledWith('--circular-origin-x', '100px')
    expect(setProperty).toHaveBeenCalledWith('--circular-origin-y', '200px')
    expect(classRemove).toHaveBeenCalledWith('circular-reveal-active')
    expect(removeProperty).toHaveBeenCalledWith('--circular-origin-x')
    expect(removeProperty).toHaveBeenCalledWith('--circular-origin-y')
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 是否支持视图过渡, 启动视图过渡, 启动圆形揭示过渡 } from './视图过渡'

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
    expect(是否支持视图过渡()).toBe(false)
  })

  it('falls back to callback when unsupported', async () => {
    const 回调 = vi.fn()
    await 启动视图过渡(回调)
    expect(回调).toHaveBeenCalled()
  })

  it('uses document.startViewTransition when available', async () => {
    const 回调 = vi.fn()
    const 视图过渡模拟 = vi.fn((cb) => {
      cb()
      return {
        updateCallbackDone: Promise.resolve(),
        ready: Promise.resolve(),
        finished: Promise.resolve(),
      }
    })

    vi.stubGlobal('document', {
      ...document,
      startViewTransition: 视图过渡模拟,
    })

    await 启动视图过渡(回调)
    expect(视图过渡模拟).toHaveBeenCalled()
    expect(回调).toHaveBeenCalled()
  })

  it('falls back to callback for circular reveal when unsupported', async () => {
    const 回调 = vi.fn()
    await 启动圆形揭示过渡(回调, { 横: 100, 纵: 200 })
    expect(回调).toHaveBeenCalled()
  })

  it('applies circular reveal class and origin properties during transition', async () => {
    const 回调 = vi.fn()
    const 加类 = vi.fn()
    const 移类 = vi.fn()
    const 设属性 = vi.fn()
    const 移属性 = vi.fn()
    const 视图过渡模拟 = vi.fn((cb) => {
      cb()
      return {
        updateCallbackDone: Promise.resolve(),
        ready: Promise.resolve(),
        finished: Promise.resolve(),
      }
    })

    vi.stubGlobal('document', {
      ...document,
      startViewTransition: 视图过渡模拟,
      documentElement: {
        classList: { add: 加类, remove: 移类 },
        style: { setProperty: 设属性, removeProperty: 移属性 },
      },
    })

    await 启动圆形揭示过渡(回调, { 横: 100, 纵: 200 })
    expect(视图过渡模拟).toHaveBeenCalled()
    expect(加类).toHaveBeenCalledWith('circular-reveal-active')
    expect(设属性).toHaveBeenCalledWith('--circular-origin-x', '100px')
    expect(设属性).toHaveBeenCalledWith('--circular-origin-y', '200px')
    expect(移类).toHaveBeenCalledWith('circular-reveal-active')
    expect(移属性).toHaveBeenCalledWith('--circular-origin-x')
    expect(移属性).toHaveBeenCalledWith('--circular-origin-y')
  })
})

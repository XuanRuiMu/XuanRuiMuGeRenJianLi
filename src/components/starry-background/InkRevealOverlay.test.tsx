import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'

const { hookState, rendererMock } = vi.hoisted(() => {
  const hookState = {
    isDark: true,
    inkEnabled: true,
    hoverable: true,
  }
  const rendererMock = vi.fn()
  return { hookState, rendererMock }
})

vi.mock('./InkRevealRenderer', () => ({
  InkRevealRenderer: class {
    constructor(options: unknown) {
      rendererMock(options)
    }
    mount = vi.fn()
    unmount = vi.fn()
    onPointerMove = vi.fn()
  },
}))

vi.mock('./useIsDarkMode', () => ({
  useIsDarkMode: () => hookState.isDark,
}))

vi.mock('../../store/useStarryUiStore', () => ({
  useStarryUiStore: (selector: (state: { inkEnabled: boolean }) => unknown) =>
    selector({ inkEnabled: hookState.inkEnabled }),
}))

import { InkRevealOverlay } from './InkRevealOverlay'

describe('InkRevealOverlay 双主题', () => {
  beforeEach(() => {
    hookState.isDark = true
    hookState.inkEnabled = true
    hookState.hoverable = true
    rendererMock.mockReset()
    vi.spyOn(window, 'matchMedia').mockImplementation(
      () =>
        ({
          matches: hookState.hoverable,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('深色模式挂载且遮罩色与星空底色一致（不透明）', () => {
    render(<InkRevealOverlay />)
    expect(rendererMock).toHaveBeenCalledWith({ enabled: true, coverColor: '#05060f', sourceCanvas: null })
  })

  it('浅色模式挂载丝绸源且覆盖色为墨黑（jsdom无WebGL回退纯色遮罩）', () => {
    hookState.isDark = false
    render(<InkRevealOverlay />)
    expect(rendererMock).toHaveBeenCalledWith({ enabled: true, coverColor: '#05060f', sourceCanvas: null })
  })

  it('非 hover 设备不挂载渲染器', () => {
    hookState.hoverable = false
    render(<InkRevealOverlay />)
    expect(rendererMock).not.toHaveBeenCalled()
  })
})

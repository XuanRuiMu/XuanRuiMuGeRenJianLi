import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const { hookState, settings, createMock, panelMock, fireSceneCtorMock } = vi.hoisted(() => {
  const settings = { dpr: 1.5 }
  const hookState = {
    loading: false,
    reducedMotion: false,
    isDark: true,
    starryHidden: false,
  }
  const createMock = vi.fn()
  const panelMock = vi.fn()
  const fireSceneCtorMock = vi.fn()
  return { hookState, settings, createMock, panelMock, fireSceneCtorMock }
})

vi.mock('../../store/useStarryUiStore', () => ({
  useStarryUiStore: (selector: (state: { starryHidden: boolean }) => unknown) =>
    selector({ starryHidden: hookState.starryHidden }),
}))

vi.mock('./StarryGalaxyScene', () => ({
  createStarryGalaxyScene: createMock,
  createStarryControlPanel: panelMock,
}))

vi.mock('../../hooks/usePerformanceProfile', () => ({
  usePerformanceProfile: () => ({
    level: 'high',
    settings,
    loading: hookState.loading,
  }),
}))

vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => hookState.reducedMotion,
}))

vi.mock('./useIsDarkMode', () => ({
  useIsDarkMode: () => hookState.isDark,
}))

vi.mock('./TeldrassilFireScene', () => ({
  TeldrassilFireScene: class {
    constructor(options: unknown) {
      fireSceneCtorMock(options)
    }
    mount = vi.fn()
    destroy = vi.fn()
  },
}))

import { StarryGalaxyBackground } from './StarryGalaxyBackground'
import { createStarryGalaxyScene } from './StarryGalaxyScene'

describe('StarryGalaxyBackground', () => {
  beforeEach(() => {
    hookState.loading = false
    hookState.reducedMotion = false
    hookState.isDark = true
    hookState.starryHidden = false
    createMock.mockReset()
    createMock.mockReturnValue({ destroy: vi.fn(), getFps: () => 60 })
    panelMock.mockReset()
    fireSceneCtorMock.mockReset()
  })

  it('深色模式挂载画布并创建场景', () => {
    render(<StarryGalaxyBackground />)

    expect(screen.getByTestId('starry-background-canvas')).toBeInTheDocument()
    expect(createStarryGalaxyScene).toHaveBeenCalledTimes(1)
    expect(createStarryGalaxyScene).toHaveBeenCalledWith(expect.any(HTMLElement), { dpr: 1.5 })
  })

  it('浅色模式不创建场景并渲染壁纸层', () => {
    hookState.isDark = false
    render(<StarryGalaxyBackground />)

    expect(screen.getByTestId('starry-background-fallback')).toBeInTheDocument()
    expect(screen.getByTestId('light-wallpaper')).toBeInTheDocument()
    expect(createStarryGalaxyScene).not.toHaveBeenCalled()
  })

  it('浅色模式壁纸层挂载燃烧泰达希尔场景（动画参数随 reducedMotion）', () => {
    hookState.isDark = false
    const { unmount } = render(<StarryGalaxyBackground />)

    expect(fireSceneCtorMock).toHaveBeenCalledWith({ reducedMotion: false })
    unmount()
    expect(fireSceneCtorMock).toHaveBeenCalledTimes(1)
  })

  it('浅色模式 reducedMotion 下场景收到静态帧选项且 data-static', () => {
    hookState.isDark = false
    hookState.reducedMotion = true
    render(<StarryGalaxyBackground />)

    expect(screen.getByTestId('light-wallpaper')).toHaveAttribute('data-static', 'true')
    expect(fireSceneCtorMock).toHaveBeenCalledWith({ reducedMotion: true })
  })

  it('浅色模式下彻底隐藏星空背景和壁纸开关同时隐藏壁纸', () => {
    hookState.isDark = false
    hookState.starryHidden = true
    render(<StarryGalaxyBackground />)

    expect(screen.queryByTestId('light-wallpaper')).not.toBeInTheDocument()
  })

  it('reducedMotion 时不创建场景并渲染降级背景', () => {
    hookState.reducedMotion = true
    render(<StarryGalaxyBackground />)

    expect(screen.getByTestId('starry-background-fallback')).toBeInTheDocument()
    expect(createStarryGalaxyScene).not.toHaveBeenCalled()
  })

  it('性能档案加载中渲染降级背景', () => {
    hookState.loading = true
    render(<StarryGalaxyBackground />)

    expect(screen.getByTestId('starry-background-fallback')).toBeInTheDocument()
  })

  it('卸载时销毁场景', () => {
    const { unmount } = render(<StarryGalaxyBackground />)
    const scene = vi.mocked(createStarryGalaxyScene).mock.results[0].value

    unmount()

    expect(scene.destroy).toHaveBeenCalledTimes(1)
  })

  it('children 正常渲染', () => {
    render(
      <StarryGalaxyBackground>
        <div data-testid="starry-child">内容</div>
      </StarryGalaxyBackground>
    )

    expect(screen.getByTestId('starry-child')).toBeInTheDocument()
  })
})

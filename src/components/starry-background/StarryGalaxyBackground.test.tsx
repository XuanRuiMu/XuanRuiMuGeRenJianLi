import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const { hookState, settings, createMock, panelMock, fireRendererCtor } = vi.hoisted(() => {
  const settings = { dpr: 1.5 }
  const hookState = {
    loading: false,
    reducedMotion: false,
    isDark: true,
    starryHidden: false,
  }
  const createMock = vi.fn()
  const panelMock = vi.fn()
  const fireRendererCtor = vi.fn()
  return { hookState, settings, createMock, panelMock, fireRendererCtor }
})

vi.mock('../../store/useStarryUiStore', () => ({
  useStarryUiStore: (selector: (state: { starryHidden: boolean }) => unknown) =>
    selector({ starryHidden: hookState.starryHidden }),
}))

vi.mock('./StarryGalaxyScene', () => ({
  createStarryGalaxyScene: createMock,
  createStarryControlPanel: panelMock,
}))

vi.mock('./TeldrassilFireRenderer', () => ({
  TeldrassilFireRenderer: fireRendererCtor,
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
    fireRendererCtor.mockReset()
    fireRendererCtor.mockImplementation(() => ({
      element: document.createElement('canvas'),
      mount: vi.fn(),
      unmount: vi.fn(),
    }))
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

  it('浅色模式渲染真实 CG 静态底图且挂载火焰粒子渲染器', () => {
    hookState.isDark = false
    render(<StarryGalaxyBackground />)

    const base = screen.getByTestId('teldrassil-base')
    expect(base).toHaveAttribute('src', '/images/teldrassil-burning-base.webp')
    expect(fireRendererCtor).toHaveBeenCalledTimes(1)
    expect(fireRendererCtor).toHaveBeenCalledWith({ imageWidth: 1920, imageHeight: 810 })
    const renderer = fireRendererCtor.mock.results[0].value
    expect(renderer.mount).toHaveBeenCalledTimes(1)
  })

  it('浅色模式 reducedMotion 下不挂载粒子渲染器且 data-static', () => {
    hookState.isDark = false
    hookState.reducedMotion = true
    render(<StarryGalaxyBackground />)

    expect(screen.getByTestId('light-wallpaper')).toHaveAttribute('data-static', 'true')
    expect(screen.getByTestId('teldrassil-base')).toHaveAttribute(
      'src',
      '/images/teldrassil-burning-base.webp'
    )
    expect(fireRendererCtor).not.toHaveBeenCalled()
  })

  it('卸载时销毁火焰粒子渲染器', () => {
    hookState.isDark = false
    const { unmount } = render(<StarryGalaxyBackground />)
    const renderer = fireRendererCtor.mock.results[0].value

    unmount()

    expect(renderer.unmount).toHaveBeenCalledTimes(1)
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

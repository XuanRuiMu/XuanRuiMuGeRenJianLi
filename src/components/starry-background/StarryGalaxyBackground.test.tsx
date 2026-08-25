import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const { hookState, settings, createMock, panelMock } = vi.hoisted(() => {
  const settings = { dpr: 1.5 }
  const hookState = {
    loading: false,
    reducedMotion: false,
    isDark: true,
    starryHidden: false,
  }
  const createMock = vi.fn()
  const panelMock = vi.fn()
  return { hookState, settings, createMock, panelMock }
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

  it('浅色模式渲染名画底图与无缝循环视频', () => {
    hookState.isDark = false
    render(<StarryGalaxyBackground />)

    const base = screen.getByTestId('kanagawa-base')
    expect(base).toHaveAttribute('src', '/images/kanagawa-wave-base.webp')
    const 视频 = screen.getByTestId('kanagawa-video')
    expect(视频).toHaveAttribute('src', '/videos/kanagawa-wave-loop.mp4')
    expect(视频).toHaveAttribute('loop')
    expect(视频).toHaveAttribute('autoplay')
    // React 的 muted 仅反映为 DOM property 而非 attribute
    expect(视频).toHaveProperty('muted', true)
    expect(视频).toHaveAttribute('playsinline')
  })

  it('浅色模式 reducedMotion 下不挂载视频且 data-static', () => {
    hookState.isDark = false
    hookState.reducedMotion = true
    render(<StarryGalaxyBackground />)

    expect(screen.getByTestId('light-wallpaper')).toHaveAttribute('data-static', 'true')
    expect(screen.getByTestId('kanagawa-base')).toHaveAttribute(
      'src',
      '/images/kanagawa-wave-base.webp'
    )
    expect(screen.queryByTestId('kanagawa-video')).not.toBeInTheDocument()
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

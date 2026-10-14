import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const { hookState, 设置, createMock, panelMock } = vi.hoisted(() => {
  const 设置 = { dpr: 1.5 }
  const hookState = {
    加载中: false,
    reducedMotion: false,
    isDark: true,
    starryHidden: false,
  }
  const createMock = vi.fn()
  const panelMock = vi.fn()
  return { hookState, 设置, createMock, panelMock }
})

vi.mock('../../状态/星空开关仓库', () => ({
  useXingKongKaiGuan: (selector: (state: { starryHidden: boolean }) => unknown) =>
    selector({ starryHidden: hookState.starryHidden }),
}))

vi.mock('./星空星系场景', () => ({
  创建星空星系场景: createMock,
  创建星空控制面板: panelMock,
}))

vi.mock('../../钩子/useXingNengDangWei', () => ({
  useXingNengDangWei: () => ({
    等级: 'high',
    设置,
    加载中: hookState.加载中,
  }),
}))

vi.mock('../../钩子/useJianShaoDongHua', () => ({
  useJianShaoDongHua: () => hookState.reducedMotion,
}))

vi.mock('./useShiFouAnSe', () => ({
  useShiFouAnSe: () => hookState.isDark,
}))

import { XingKongXiXiBeiJing } from './星空星系背景'
import { 创建星空星系场景 } from './星空星系场景'

describe('StarryGalaxyBackground', () => {
  beforeEach(() => {
    hookState.加载中 = false
    hookState.reducedMotion = false
    hookState.isDark = true
    hookState.starryHidden = false
    createMock.mockReset()
    createMock.mockReturnValue({ destroy: vi.fn(), getFps: () => 60 })
    panelMock.mockReset()
  })

  it('深色模式挂载画布并创建场景', () => {
    render(<XingKongXiXiBeiJing />)

    expect(screen.getByTestId('starry-background-canvas')).toBeInTheDocument()
    expect(创建星空星系场景).toHaveBeenCalledTimes(1)
    expect(创建星空星系场景).toHaveBeenCalledWith(expect.any(HTMLElement), { dpr: 1.5 })
  })

  it('浅色模式不创建场景并渲染壁纸层', () => {
    hookState.isDark = false
    render(<XingKongXiXiBeiJing />)

    expect(screen.getByTestId('starry-background-fallback')).toBeInTheDocument()
    expect(screen.getByTestId('light-wallpaper')).toBeInTheDocument()
    expect(创建星空星系场景).not.toHaveBeenCalled()
  })

  it('浅色模式渲染名画底图与无缝循环视频', () => {
    hookState.isDark = false
    render(<XingKongXiXiBeiJing />)

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
    render(<XingKongXiXiBeiJing />)

    expect(screen.getByTestId('light-wallpaper')).toHaveAttribute('data-static', 'true')
    expect(screen.getByTestId('kanagawa-base')).toHaveAttribute('src', '/images/kanagawa-wave-base.webp')
    expect(screen.queryByTestId('kanagawa-video')).not.toBeInTheDocument()
  })

  it('浅色模式下彻底隐藏星空背景和壁纸开关同时隐藏壁纸', () => {
    hookState.isDark = false
    hookState.starryHidden = true
    render(<XingKongXiXiBeiJing />)

    expect(screen.queryByTestId('light-wallpaper')).not.toBeInTheDocument()
  })

  it('reducedMotion 时不创建场景并渲染降级背景', () => {
    hookState.reducedMotion = true
    render(<XingKongXiXiBeiJing />)

    expect(screen.getByTestId('starry-background-fallback')).toBeInTheDocument()
    expect(创建星空星系场景).not.toHaveBeenCalled()
  })

  it('性能档案加载中渲染降级背景', () => {
    hookState.加载中 = true
    render(<XingKongXiXiBeiJing />)

    expect(screen.getByTestId('starry-background-fallback')).toBeInTheDocument()
  })

  it('卸载时销毁场景', () => {
    const { unmount } = render(<XingKongXiXiBeiJing />)
    const scene = vi.mocked(创建星空星系场景).mock.results[0].value

    unmount()

    expect(scene.destroy).toHaveBeenCalledTimes(1)
  })

  it('children 正常渲染', () => {
    render(
      <XingKongXiXiBeiJing>
        <div data-testid="starry-child">内容</div>
      </XingKongXiXiBeiJing>
    )

    expect(screen.getByTestId('starry-child')).toBeInTheDocument()
  })
})

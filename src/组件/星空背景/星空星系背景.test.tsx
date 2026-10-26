import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const {
  hookState: 钩子状态,
  设置,
  createMock: 创建测试替身,
  panelMock: 面板测试替身,
} = vi.hoisted(() => {
  const 设置 = { dpr: 1.5 }
  const 钩子状态 = {
    加载中: false,
    reducedMotion: false,
    isDark: true,
    starryHidden: false,
  }
  const 创建测试替身 = vi.fn()
  const 面板测试替身 = vi.fn()
  return { hookState: 钩子状态, 设置, createMock: 创建测试替身, panelMock: 面板测试替身 }
})

vi.mock('../../状态/星空开关仓库', () => ({
  useXingKongKaiGuan: (选择器: (状态: { 星空隐藏: boolean }) => unknown) => 选择器({ 星空隐藏: 钩子状态.starryHidden }),
}))

vi.mock('./星空星系场景', () => ({
  创建星空星系场景: 创建测试替身,
  创建星空控制面板: 面板测试替身,
}))

vi.mock('../../钩子/useXingNengDangWei', () => ({
  useXingNengDangWei: () => ({
    等级: 'high',
    设置,
    加载中: 钩子状态.加载中,
  }),
}))

vi.mock('../../钩子/useJianShaoDongHua', () => ({
  useJianShaoDongHua: () => 钩子状态.reducedMotion,
}))

vi.mock('./useShiFouAnSe', () => ({
  useShiFouAnSe: () => 钩子状态.isDark,
}))

import { XingKongXiXiBeiJing } from './星空星系背景'
import { 创建星空星系场景 } from './星空星系场景'

describe('StarryGalaxyBackground', () => {
  beforeEach(() => {
    钩子状态.加载中 = false
    钩子状态.reducedMotion = false
    钩子状态.isDark = true
    钩子状态.starryHidden = false
    创建测试替身.mockReset()
    创建测试替身.mockReturnValue({ destroy: vi.fn(), getFps: () => 60 })
    面板测试替身.mockReset()
  })

  it('深色模式挂载画布并创建场景', async () => {
    render(<XingKongXiXiBeiJing />)

    expect(await screen.findByTestId('starry-background-canvas')).toBeInTheDocument()
    await waitFor(() => expect(创建星空星系场景).toHaveBeenCalledTimes(1))
    expect(创建星空星系场景).toHaveBeenCalledWith(expect.any(HTMLElement), { dpr: 1.5 })
  })

  it('浅色模式不创建场景并渲染壁纸层', () => {
    钩子状态.isDark = false
    render(<XingKongXiXiBeiJing />)

    expect(screen.getByTestId('starry-background-fallback')).toBeInTheDocument()
    expect(screen.getByTestId('light-wallpaper')).toBeInTheDocument()
    expect(创建星空星系场景).not.toHaveBeenCalled()
  })

  it('浅色模式静默下载视频并在可播放后显示', async () => {
    钩子状态.isDark = false
    render(<XingKongXiXiBeiJing />)

    const 基础 = screen.getByTestId('kanagawa-base')
    expect(基础).toHaveAttribute('src', '/images/kanagawa-wave-base.webp')
    const 视频 = await screen.findByTestId('kanagawa-video')
    expect(视频).toHaveAttribute('src', '/videos/kanagawa-wave-loop.mp4')
    expect(视频).toHaveAttribute('loop')
    expect(视频).toHaveAttribute('preload', 'auto')
    expect(视频).toHaveAttribute('data-ready', 'false')

    fireEvent(视频, new Event('canplaythrough'))
    await waitFor(() => expect(视频).toHaveAttribute('data-ready', 'true'))
    expect(视频).toHaveAttribute('autoplay')
    expect(视频).toHaveProperty('muted', true)
    expect(视频).toHaveAttribute('playsinline')
  })

  it('浅色模式 reducedMotion 下不挂载视频且 data-static', () => {
    钩子状态.isDark = false
    钩子状态.reducedMotion = true
    render(<XingKongXiXiBeiJing />)

    expect(screen.getByTestId('light-wallpaper')).toHaveAttribute('data-static', 'true')
    expect(screen.getByTestId('kanagawa-base')).toHaveAttribute('src', '/images/kanagawa-wave-base.webp')
    expect(screen.queryByTestId('kanagawa-video')).not.toBeInTheDocument()
  })

  it('浅色模式下彻底隐藏星空背景和壁纸开关同时隐藏壁纸', () => {
    钩子状态.isDark = false
    钩子状态.starryHidden = true
    render(<XingKongXiXiBeiJing />)

    expect(screen.queryByTestId('light-wallpaper')).not.toBeInTheDocument()
  })

  it('reducedMotion 时不创建场景并渲染降级背景', () => {
    钩子状态.reducedMotion = true
    render(<XingKongXiXiBeiJing />)

    expect(screen.getByTestId('starry-background-fallback')).toBeInTheDocument()
    expect(创建星空星系场景).not.toHaveBeenCalled()
  })

  it('性能档案加载中渲染降级背景', () => {
    钩子状态.加载中 = true
    render(<XingKongXiXiBeiJing />)

    expect(screen.getByTestId('starry-background-fallback')).toBeInTheDocument()
  })

  it('卸载时销毁场景', async () => {
    const { unmount: 卸载 } = render(<XingKongXiXiBeiJing />)
    await waitFor(() => expect(创建星空星系场景).toHaveBeenCalledTimes(1))
    const 场景 = vi.mocked(创建星空星系场景).mock.results[0].value

    卸载()

    expect(场景.destroy).toHaveBeenCalledTimes(1)
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

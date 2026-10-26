import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'

const { 状态, 实例表 } = vi.hoisted(() => ({
  状态: {
    isDark: true,
    inkEnabled: true,
    触摸: false,
    减少动画: false,
    选项表: [] as unknown[],
  },
  实例表: [] as Array<{ onPointerMove: ReturnType<typeof vi.fn> }>,
}))

vi.mock('./水墨显现渲染器', () => ({
  水墨显现渲染器: class {
    onPointerMove = vi.fn()
    挂载 = vi.fn()
    卸载 = vi.fn()
    constructor(选项: unknown) {
      状态.选项表.push(选项)
      实例表.push(this as unknown as { onPointerMove: ReturnType<typeof vi.fn> })
    }
  },
}))

vi.mock('./useShiFouAnSe', () => ({
  useShiFouAnSe: () => 状态.isDark,
}))

vi.mock('../../状态/星空开关仓库', () => ({
  useXingKongKaiGuan: (选择器: (状态: { 墨迹启用: boolean }) => unknown) => 选择器({ 墨迹启用: 状态.inkEnabled }),
}))

import { ShuiMoXianXianZheZhao } from './水墨显现遮罩'

function 模拟媒体查询() {
  vi.spyOn(window, 'matchMedia').mockImplementation((查询: string) => {
    const 问触摸 = 查询.includes('coarse')
    const 问减少动画 = 查询.includes('prefers-reduced-motion')
    const 匹配 = 问触摸 ? 状态.触摸 : 问减少动画 ? 状态.减少动画 : !状态.触摸
    return {
      matches: 匹配,
      media: 查询,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList
  })
}

describe('水墨显现遮罩 双主题与全端覆盖', () => {
  beforeEach(() => {
    状态.isDark = true
    状态.inkEnabled = true
    状态.触摸 = false
    状态.减少动画 = false
    状态.选项表 = []
    实例表.length = 0
    模拟媒体查询()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('深色模式挂载且遮罩色与星空底色一致', () => {
    render(<ShuiMoXianXianZheZhao />)
    expect(状态.选项表[0]).toEqual({ 启用: true, 遮罩颜色: '#05060f', 遮罩源画布: null })
  })

  it('浅色模式挂载丝绸源，无 WebGL 时回退纯色遮罩', () => {
    const 原生获取上下文 = HTMLCanvasElement.prototype.getContext
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
      this: HTMLCanvasElement,
      类型,
      ...参数
    ) {
      if (类型 === 'webgl2') return null
      return 原生获取上下文.call(this, 类型, ...参数)
    } as typeof HTMLCanvasElement.prototype.getContext)
    状态.isDark = false
    render(<ShuiMoXianXianZheZhao />)
    expect(状态.选项表[0]).toEqual({ 启用: true, 遮罩颜色: '#05060f', 遮罩源画布: null })
  })

  it('桌面端不自动运笔，只响应指针', () => {
    render(<ShuiMoXianXianZheZhao />)
    expect(实例表[0].onPointerMove).not.toHaveBeenCalled()
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 120, clientY: 80 }))
    expect(实例表[0].onPointerMove).toHaveBeenCalledWith(120, 80)
  })

  it('手机与 iPad 同样挂载遮罩，触摸可揭示', () => {
    状态.触摸 = true
    render(<ShuiMoXianXianZheZhao />)
    expect(状态.选项表).toHaveLength(1)
    expect(实例表[0].onPointerMove).not.toHaveBeenCalled()
    window.dispatchEvent(new PointerEvent('pointerdown', { clientX: 80, clientY: 60 }))
    expect(实例表[0].onPointerMove).toHaveBeenCalledWith(80, 60)
  })

  it('触摸设备开启减少动画时不自动运笔，仍保留遮罩与触摸揭示', () => {
    状态.触摸 = true
    状态.减少动画 = true
    render(<ShuiMoXianXianZheZhao />)
    expect(实例表[0].onPointerMove).not.toHaveBeenCalled()
    window.dispatchEvent(new PointerEvent('pointerdown', { clientX: 60, clientY: 40 }))
    expect(实例表[0].onPointerMove).toHaveBeenCalledWith(60, 40)
  })

  it('关闭墨迹开关时不创建遮罩', () => {
    状态.inkEnabled = false
    render(<ShuiMoXianXianZheZhao />)
    expect(状态.选项表[0]).toMatchObject({ 启用: false })
  })
})

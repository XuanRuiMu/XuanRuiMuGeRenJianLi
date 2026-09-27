import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { ProjectsSection } from './ProjectsSection'
import { 最小带宽 } from './clotheslineLayout'

/**
 * FP-01：浏览器缩放（宽→窄→宽）往返后晾衣架区域必须回到初始态。
 * jsdom 无布局引擎，故按真实布局语义给晾衣架链路打桩：
 *   .clothesline-scroll   clientWidth = 视口宽，scrollWidth = max(视口宽, 区域铺开宽)
 *   .clothesline-region   宽 = max(内联 min-width, 视口宽)（外层把区域拉伸铺满），高固定
 *   .clothesline-canvas   与区域同宽同高（inset:0）
 * 便签位置读内联 transform（jsdom 的 getBoundingClientRect 恒为 0）。
 * ResizeObserver 换成可控实现：视口宽变化后由测试显式驱动重建。
 */
interface 布局桩 {
  设视口宽: (宽: number) => void
  触发重建: () => void
  还原: () => void
}

function 装布局桩(初始视口宽: number): 布局桩 {
  const 原始 = new Map<string, PropertyDescriptor | undefined>()
  let 视口宽 = 初始视口宽
  let 观察回调: (() => void) | null = null

  class 可控ResizeObserver {
    constructor(回调: () => void) {
      观察回调 = 回调
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  const 是 = (el: Element, 类: string) => el.classList.contains(类)
  const 区域铺开宽 = (el: Element) => Math.max(Number.parseFloat((el as HTMLElement).style.minWidth) || 0, 视口宽)

  const 定义 = (名: string, 计算: (el: HTMLElement) => number) => {
    原始.set(名, Object.getOwnPropertyDescriptor(HTMLElement.prototype, 名))
    Object.defineProperty(HTMLElement.prototype, 名, {
      get(this: HTMLElement) {
        return 计算(this)
      },
      configurable: true,
    })
  }

  定义('clientWidth', (el) => {
    if (是(el, 'clothesline-scroll')) return 视口宽
    if (是(el, 'clothesline-region')) return 区域铺开宽(el)
    return 0
  })
  定义('offsetWidth', (el) => {
    if (是(el, 'clothesline-scroll')) return 视口宽
    if (是(el, 'clothesline-region')) return 区域铺开宽(el)
    if (是(el, 'clothesline-canvas')) return 区域铺开宽(el)
    return 0
  })
  定义('offsetHeight', (el) => (是(el, 'clothesline-region') || 是(el, 'clothesline-canvas') ? 480 : 0))
  定义('scrollWidth', (el) => {
    if (是(el, 'clothesline-scroll')) {
      const 区域 = el.querySelector('.clothesline-region')
      return Math.max(视口宽, 区域 ? 区域铺开宽(区域) : 0)
    }
    return 0
  })

  vi.stubGlobal('ResizeObserver', 可控ResizeObserver)
  ;(window as unknown as { ResizeObserver: unknown }).ResizeObserver = 可控ResizeObserver

  return {
    设视口宽: (宽: number) => {
      视口宽 = 宽
    },
    触发重建: () => {
      观察回调?.()
    },
    还原: () => {
      for (const [名, 描述] of 原始) {
        if (描述) Object.defineProperty(HTMLElement.prototype, 名, 描述)
        else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[名]
      }
      vi.unstubAllGlobals()
    },
  }
}

const 区域元素 = (container: HTMLElement) => container.querySelector('.clothesline-region') as HTMLElement

const 区域最小宽 = (container: HTMLElement) => Number.parseFloat(区域元素(container).style.minWidth)

/** 便签集群的水平中心（区域坐标系）：内联 transform 的 translateX + 自身宽的一半 */
function 集群中心(container: HTMLElement): number {
  const 便签们 = [...container.querySelectorAll('.clothesline-note')] as HTMLElement[]
  expect(便签们.length).toBeGreaterThan(0)
  const 中心表 = 便签们.map((便签) => {
    const 匹配 = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(便签.style.transform)
    if (!匹配) throw new Error(`便签缺少 translate 变换: ${便签.style.transform}`)
    const 宽 = Number.parseFloat(便签.style.width)
    expect(Number.isFinite(宽)).toBe(true)
    return Number.parseFloat(匹配[1]) + 宽 / 2
  })
  return (Math.min(...中心表) + Math.max(...中心表)) / 2
}

describe('ClotheslineNotes 缩放往返（FP-01）', () => {
  let 桩: 布局桩 | null = null

  beforeEach(() => {
    // 减少动画：物理循环不启动，便签停在静止挂点 → 断言只反映布局而非摆动
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        get matches() {
          return query.includes('prefers-reduced-motion')
        },
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    桩?.还原()
    桩 = null
    vi.restoreAllMocks()
  })

  it('首帧即完成布局：区域最小宽被回写、便签已可见（基准宽退化不再跳过构建）', () => {
    桩 = 装布局桩(1920)
    const { container } = render(<ProjectsSection />)
    expect(区域最小宽(container)).toBe(1920)
    expect(区域元素(container).offsetWidth).toBe(1920)
    const 便签们 = [...container.querySelectorAll('.clothesline-note')] as HTMLElement[]
    expect(便签们.length).toBeGreaterThan(0)
    for (const 便签 of 便签们) expect(便签.style.opacity).toBe('1')
  })

  it('宽→窄→宽往返：区域最小宽与便签集群中心回到初始值（≤1px），min-width 无单调残留', () => {
    桩 = 装布局桩(1920)
    const { container } = render(<ProjectsSection />)
    const 初始最小宽 = 区域最小宽(container)
    const 初始区域宽 = 区域元素(container).offsetWidth
    const 初始集群中心 = 集群中心(container)
    expect(初始最小宽).toBe(1920)
    // 静止挂点关于主跨对称 → 集群中心精确落在区域内容盒中线（便签居中不变量）
    expect(Math.abs(初始集群中心 - 初始区域宽 / 2)).toBeLessThanOrEqual(2)

    const 往返 = () => {
      桩!.设视口宽(640)
      桩!.触发重建()
      const 窄最小宽 = 区域最小宽(container)
      expect(窄最小宽).toBe(最小带宽)
      expect(窄最小宽).toBeLessThan(初始最小宽)
      expect(窄最小宽).toBeLessThan(区域元素(container).offsetWidth + 最小带宽)
      桩!.设视口宽(1920)
      桩!.触发重建()
    }

    往返()
    expect(Math.abs(区域最小宽(container) - 初始最小宽)).toBeLessThanOrEqual(1)
    expect(Math.abs(区域元素(container).offsetWidth - 初始区域宽)).toBeLessThanOrEqual(1)
    expect(Math.abs(集群中心(container) - 初始集群中心)).toBeLessThanOrEqual(1)
    const 第一轮恢复 = 区域最小宽(container)

    往返()
    expect(区域最小宽(container)).toBe(第一轮恢复)
    expect(Math.abs(集群中心(container) - 初始集群中心)).toBeLessThanOrEqual(1)
  })
})

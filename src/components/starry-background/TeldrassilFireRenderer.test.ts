import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TeldrassilFireRenderer } from './TeldrassilFireRenderer'

const 上下文 = {
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  fillStyle: '',
  globalCompositeOperation: 'source-over',
}

let rafCallbacks: FrameRequestCallback[] = []
const 驱动帧 = (t: number) => {
  const cbs = [...rafCallbacks]
  rafCallbacks = []
  cbs.forEach((cb) => cb(t))
}

describe('TeldrassilFireRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rafCallbacks = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    })
    vi.stubGlobal('cancelAnimationFrame', () => {
      rafCallbacks = []
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      上下文 as unknown as CanvasRenderingContext2D
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('构造时按视口与 DPR 设置画布尺寸', () => {
    const renderer = new TeldrassilFireRenderer({ imageWidth: 1920, imageHeight: 810 })
    const canvas = renderer.element

    expect(canvas.width).toBe(window.innerWidth)
    expect(canvas.height).toBe(window.innerHeight)
    expect(canvas.style.width).toBe(window.innerWidth + 'px')
    expect(上下文.setTransform).toHaveBeenCalled()
  })

  it('mount 将画布挂载到容器并启动动画循环', () => {
    const renderer = new TeldrassilFireRenderer({ imageWidth: 1920, imageHeight: 810 })
    const container = document.createElement('div')
    renderer.mount(container)

    expect(container.contains(renderer.element)).toBe(true)
    expect(rafCallbacks.length).toBe(1)
  })

  it('动画帧执行粒子与火光绘制', () => {
    const renderer = new TeldrassilFireRenderer({ imageWidth: 1920, imageHeight: 810 })
    renderer.mount(document.createElement('div'))

    驱动帧(16)
    驱动帧(32)

    expect(上下文.clearRect).toHaveBeenCalled()
    expect(上下文.arc).toHaveBeenCalled()
    expect(上下文.fillRect).toHaveBeenCalled()
    expect(上下文.createRadialGradient).toHaveBeenCalled()
  })

  it('窗口 resize 后画布尺寸跟随更新', () => {
    const renderer = new TeldrassilFireRenderer({ imageWidth: 1920, imageHeight: 810 })
    renderer.mount(document.createElement('div'))

    const 原宽 = window.innerWidth
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    window.dispatchEvent(new Event('resize'))

    expect(renderer.element.style.width).toBe('800px')
    expect(renderer.element.width).toBeGreaterThanOrEqual(800)
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(原宽)
  })

  it('长时间运行粒子重生且循环持续', () => {
    const renderer = new TeldrassilFireRenderer({ imageWidth: 1920, imageHeight: 810 })
    renderer.mount(document.createElement('div'))

    let t = 0
    for (let i = 0; i < 700; i++) {
      t += 16
      驱动帧(t)
    }

    expect(rafCallbacks.length).toBe(1)
    expect(上下文.arc.mock.calls.length).toBeGreaterThan(100)
  })

  it('unmount 移除画布并停止动画循环', () => {
    const renderer = new TeldrassilFireRenderer({ imageWidth: 1920, imageHeight: 810 })
    const container = document.createElement('div')
    renderer.mount(container)
    renderer.unmount()

    expect(container.contains(renderer.element)).toBe(false)
    const 调用数 = 上下文.clearRect.mock.calls.length
    驱动帧(999)
    expect(上下文.clearRect.mock.calls.length).toBe(调用数)
  })

  it('getContext 不可用时构造抛出明确错误', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(() => new TeldrassilFireRenderer({ imageWidth: 1920, imageHeight: 810 })).toThrow(
      '无法创建 2D context'
    )
  })
})

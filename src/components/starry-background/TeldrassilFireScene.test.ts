import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TeldrassilFireScene, 火焰池上限, 余烬池上限 } from './TeldrassilFireScene'

function 创建mock二维上下文() {
  const 渐变 = { addColorStop: vi.fn() }
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    createLinearGradient: vi.fn(() => ({ ...渐变 })),
    createRadialGradient: vi.fn(() => ({ ...渐变 })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
  } as unknown as CanvasRenderingContext2D
}

describe('TeldrassilFireScene', () => {
  let container: HTMLDivElement
  let rafSpy: ReturnType<typeof 安装raf间谍>
  let cancelSpy: ReturnType<typeof 安装cancel间谍>
  let raf计数: number
  const 已建场景: TeldrassilFireScene[] = []

  function 安装raf间谍() {
    return vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => ++raf计数)
  }
  function 安装cancel间谍() {
    return vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
  }

  // 便于构造并登记场景：afterEach 强制回收，防单例失败后监听器泄漏级联污染后续用例
  function 建场景(options?: { reducedMotion?: boolean }) {
    const 场景 = new TeldrassilFireScene(options)
    已建场景.push(场景)
    return 场景
  }

  beforeEach(() => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true, configurable: true })
    Object.defineProperty(window, 'innerWidth', { value: 1440, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 900, writable: true, configurable: true })

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
      this: HTMLCanvasElement,
      type: string
    ) {
      if (type !== '2d') return null
      return 创建mock二维上下文()
    } as never)

    raf计数 = 0
    rafSpy = 安装raf间谍()
    cancelSpy = 安装cancel间谍()

    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    for (const 场景 of 已建场景.splice(0)) 场景.destroy()
    delete (document as { visibilityState?: string }).visibilityState
    document.body.removeChild(container)
    vi.restoreAllMocks()
  })

  it('动画模式启动循环且粒子数恒不突破池上限', () => {
    const 场景 = 建场景()
    场景.mount(container)

    expect(rafSpy).toHaveBeenCalled()

    let now = 1000
    for (let i = 0; i < 600; i++) {
      now += 33
      场景.step(now)
      const 计数 = 场景.获取粒子计数()
      expect(计数.火焰).toBeLessThanOrEqual(火焰池上限)
      expect(计数.余烬).toBeLessThanOrEqual(余烬池上限)
    }
    // 发射器维持高水位（接近上限），证明对象池持续复用而非空转
    let 计数 = 场景.获取粒子计数()
    expect(计数.火焰).toBeGreaterThan(100)
    expect(计数.余烬).toBeGreaterThan(40)

    for (let i = 0; i < 300; i++) {
      now += 41
      场景.step(now)
    }
    计数 = 场景.获取粒子计数()
    expect(计数.火焰).toBeLessThanOrEqual(火焰池上限)
    expect(计数.余烬).toBeLessThanOrEqual(余烬池上限)
  })

  it('resize 重绘静态层且不崩溃', () => {
    const 场景 = 建场景()
    场景.mount(container)
    const 画布 = container.querySelector('canvas')
    expect(画布).not.toBeNull()

    Object.defineProperty(window, 'innerWidth', { value: 860, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 720, writable: true, configurable: true })

    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow()
    expect(画布?.width).toBe(860)
  })

  it('destroy 后取消 rAF 并移除画布且可重复调用', () => {
    const 场景 = 建场景()
    场景.mount(container)
    const 首个rafId = rafSpy.mock.results[0]?.value

    场景.destroy()

    expect(cancelSpy).toHaveBeenCalledWith(首个rafId)
    expect(container.querySelector('canvas')).toBeNull()
    expect(() => 场景.destroy()).not.toThrow()
  })

  it('reduced-motion 不启动循环但仍绘制静态单帧', () => {
    const 场景 = 建场景({ reducedMotion: true })
    场景.mount(container)

    expect(rafSpy).not.toHaveBeenCalled()
    const 画布 = container.querySelector('canvas')
    expect(画布).not.toBeNull()
    expect((画布 as HTMLCanvasElement).width).toBeGreaterThan(0)

    expect(() => 场景.step(2000)).not.toThrow()

    window.dispatchEvent(new Event('resize'))
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    // 全程未调度任何动画帧（含恢复可见后）
    expect(rafSpy).not.toHaveBeenCalled()
  })

  it('页面隐藏时暂停循环、恢复可见后重新调度', () => {
    const 场景 = 建场景()
    场景.mount(container)
    const 首次调用数 = rafSpy.mock.calls.length

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(cancelSpy).toHaveBeenCalled()
    const 取消次数 = cancelSpy.mock.calls.length

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(rafSpy.mock.calls.length).toBeGreaterThan(首次调用数)
    expect(cancelSpy.mock.calls.length).toBe(取消次数)
  })
})

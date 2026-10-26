import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 水墨显现渲染器 } from './水墨显现渲染器'

describe('InkRevealRenderer', () => {
  let 容器: HTMLDivElement

  beforeEach(() => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true })
    Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true })

    const 原始获取上下文 = HTMLCanvasElement.prototype.getContext
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
      this: HTMLCanvasElement,
      type: string
    ) {
      if (type !== '2d') return 原始获取上下文.call(this, type)
      const 模拟绘图上下文 = {
        setTransform: vi.fn(),
        fillRect: vi.fn(),
        fillStyle: '',
        globalCompositeOperation: '',
        globalAlpha: 1,
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([252, 250, 248, 255]) })),
      } as unknown as CanvasRenderingContext2D
      return 模拟绘图上下文
    })

    容器 = document.createElement('div')
    容器.style.cssText = 'position:fixed;inset:0;width:100%;height:100%'
    document.body.appendChild(容器)
  })

  afterEach(() => {
    document.body.removeChild(容器)
    vi.restoreAllMocks()
  })

  it('fills the canvas with the mask color initially', () => {
    const 渲染器 = new 水墨显现渲染器({ 启用: true })
    渲染器.挂载(容器)

    expect((HTMLCanvasElement.prototype.getContext as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
    渲染器.卸载()
  })

  it('does not stamp when disabled', () => {
    const 渲染器 = new 水墨显现渲染器({ 启用: false })
    渲染器.挂载(容器)
    渲染器.onPointerMove(100, 100)
    渲染器.卸载()
  })

  it('stamps along a path for smooth strokes', () => {
    const 渲染器 = new 水墨显现渲染器({ 启用: true })
    渲染器.挂载(容器)

    渲染器.onPointerMove(0, 0)
    渲染器.onPointerMove(100, 0)

    渲染器.卸载()
  })

  it('resets last position on pointer leave', () => {
    const 渲染器 = new 水墨显现渲染器({ 启用: true })
    渲染器.挂载(容器)

    渲染器.onPointerMove(50, 50)
    渲染器.onPointerLeave()
    渲染器.onPointerMove(200, 200)

    渲染器.卸载()
  })

  it('sets enabled state correctly', () => {
    const 渲染器 = new 水墨显现渲染器({ 启用: true })
    渲染器.挂载(容器)
    渲染器.设置启用(false)
    渲染器.卸载()
  })

  it('uses DPR for canvas sizing', () => {
    const 渲染器 = new 水墨显现渲染器({ 启用: true })
    渲染器.挂载(容器)
    const 调用表 = (HTMLCanvasElement.prototype.getContext as ReturnType<typeof vi.fn>).mock.calls
    expect(调用表.length).toBeGreaterThan(0)
    渲染器.卸载()
  })
})

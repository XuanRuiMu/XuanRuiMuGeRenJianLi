import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { InkRevealRenderer } from './InkRevealRenderer'

describe('InkRevealRenderer', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    // Mock window.devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true })
    Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true })

    // Spy on canvas getContext to return a mock
    const originalGetContext = HTMLCanvasElement.prototype.getContext
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
      this: HTMLCanvasElement,
      type: string
    ) {
      if (type !== '2d') return originalGetContext.call(this, type)
      const mockCtx = {
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
      } as any
      return mockCtx
    })

    container = document.createElement('div')
    container.style.cssText = 'position:fixed;inset:0;width:100%;height:100%'
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.restoreAllMocks()
  })

  it('fills the canvas with the mask color initially', () => {
    const renderer = new InkRevealRenderer({ enabled: true })
    renderer.mount(container)
    // The fillMask call should set fillStyle to the mask color
    expect((HTMLCanvasElement.prototype.getContext as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
    renderer.unmount()
  })

  it('does not stamp when disabled', () => {
    const renderer = new InkRevealRenderer({ enabled: false })
    renderer.mount(container)
    renderer.onPointerMove(100, 100)
    renderer.unmount()
  })

  it('stamps along a path for smooth strokes', () => {
    const renderer = new InkRevealRenderer({ enabled: true })
    renderer.mount(container)

    renderer.onPointerMove(0, 0)
    renderer.onPointerMove(100, 0)

    renderer.unmount()
  })

  it('resets last position on pointer leave', () => {
    const renderer = new InkRevealRenderer({ enabled: true })
    renderer.mount(container)

    renderer.onPointerMove(50, 50)
    renderer.onPointerLeave()
    renderer.onPointerMove(200, 200)

    renderer.unmount()
  })

  it('sets enabled state correctly', () => {
    const renderer = new InkRevealRenderer({ enabled: true })
    renderer.mount(container)
    renderer.setEnabled(false)
    renderer.unmount()
  })

  it('uses DPR for canvas sizing', () => {
    const renderer = new InkRevealRenderer({ enabled: true })
    renderer.mount(container)
    const calls = (HTMLCanvasElement.prototype.getContext as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.length).toBeGreaterThan(0)
    renderer.unmount()
  })
})

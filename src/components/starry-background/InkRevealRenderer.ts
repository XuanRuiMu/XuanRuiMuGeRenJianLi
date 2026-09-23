/**
 * 墨迹揭示渲染器 — 100% 还原 mimo.xiaomi.com 的水墨画笔效果。
 *
 * 核心设计（与 mimo 完全一致）：
 * - 遮挡层是一张全屏 canvas，默认涂满 #05060f（与星空背景色一致）（z-index:1，盖住星空 z-0、被内容 z-10 压住）。
 * - 鼠标划过：沿指针轨迹插值连续生成膨胀墨点（destination-out 擦除），每个墨点从 R_START=8 膨胀到 R_END=128，
 *   边缘带有正弦波扰动（模拟毛笔不规则边缘），随时间淡出。
 * - 无复原机制：一旦擦除，永远保持透明（与 mimo 一致）。
 * - 仅 hover 设备生效：touch 设备跳过，绘画直接透出。
 * - DPR 感知：使用 devicePixelRatio 保证高清渲染。
 */

export interface InkRevealOptions {
  enabled?: boolean
  coverColor?: string
  sourceCanvas?: HTMLCanvasElement | null
}

interface Stamp {
  x: number
  y: number
  born: number
  seed: number
  rmax: number
}

const R_START = 8
const R_END = 128
const R_VARY = 0.45
const LIFETIME = 520
const STAMP_STEP = 12
const MAX_STAMPS = 160

export class InkRevealRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private rafId: number | null = null
  private enabled: boolean
  private readonly coverColor: string
  private readonly coverRgb: string
  private readonly sourceCanvas: HTMLCanvasElement | null
  private dpr = 1
  private w = 0
  private h = 0
  private lastX: number | null = null
  private lastY: number | null = null
  private stamps: Stamp[] = []
  private running = false

  constructor(options: InkRevealOptions = {}) {
    this.enabled = options.enabled ?? true
    this.coverColor = options.coverColor ?? '#05060f'
    this.coverRgb = this.hexToRgb(this.coverColor)
    this.sourceCanvas = options.sourceCanvas ?? null

    this.canvas = document.createElement('canvas')
    this.canvas.className = 'ink-reveal-overlay'
    this.canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;'

    const ctx = this.canvas.getContext('2d', { alpha: true })
    if (!ctx) throw new Error('无法创建 2D context')
    this.ctx = ctx

    this.resize()
    this.fillMask()
  }

  mount(container: HTMLElement) {
    container.appendChild(this.canvas)
    window.addEventListener('resize', this.resize)
    // 动态源（丝绸遮罩）需要持续重绘，挂载即启动循环
    if (this.sourceCanvas) {
      this.startLoop()
    }
  }

  unmount() {
    window.removeEventListener('resize', this.resize)
    this.stopLoop()
    const parentNode = this.canvas.parentNode
    if (parentNode != null) {
      parentNode.removeChild(this.canvas)
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (!enabled) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    } else {
      this.fillMask()
    }
  }

  onPointerMove(x: number, y: number) {
    if (!this.enabled) return
    const px = x
    const py = y

    if (this.lastX !== null && this.lastY !== null) {
      const dx = px - this.lastX
      const dy = py - this.lastY
      const dist = Math.hypot(dx, dy)
      const steps = Math.max(1, Math.ceil(dist / STAMP_STEP))
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        this.addStamp(this.lastX + dx * t, this.lastY + dy * t)
      }
    } else {
      this.addStamp(px, py)
    }

    this.lastX = px
    this.lastY = py
    this.startLoop()
  }

  onPointerLeave() {
    this.lastX = null
    this.lastY = null
  }

  private addStamp(x: number, y: number) {
    if (this.stamps.length >= MAX_STAMPS) this.stamps.shift()
    this.stamps.push({
      x,
      y,
      born: performance.now(),
      seed: Math.random() * Math.PI * 2,
      rmax: R_END * (1 - R_VARY + Math.random() * R_VARY),
    })
  }

  private fillMask() {
    if (!this.enabled) return
    this.ctx.globalCompositeOperation = 'source-over'
    if (this.sourceCanvas) {
      this.ctx.drawImage(this.sourceCanvas, 0, 0, this.w, this.h)
    } else {
      this.ctx.fillStyle = 'rgb(' + this.coverRgb + ')'
      this.ctx.fillRect(0, 0, this.w, this.h)
    }
  }

  private resize = () => {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.w = window.innerWidth
    this.h = window.innerHeight
    this.canvas.width = Math.round(this.w * this.dpr)
    this.canvas.height = Math.round(this.h * this.dpr)
    this.canvas.style.width = this.w + 'px'
    this.canvas.style.height = this.h + 'px'
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.fillMask()
  }

  private startLoop() {
    if (!this.running) {
      this.running = true
      this.rafId = requestAnimationFrame(this.tick)
    }
  }

  private tick = () => {
    const now = performance.now()
    let hasStamps = false

    this.ctx.globalCompositeOperation = 'source-over'
    // 不透明遮罩直接重涂覆盖全屏，再经 destination-out 擦出墨迹
    if (this.sourceCanvas) {
      this.ctx.drawImage(this.sourceCanvas, 0, 0, this.w, this.h)
    } else {
      this.ctx.fillStyle = 'rgb(' + this.coverRgb + ')'
      this.ctx.fillRect(0, 0, this.w, this.h)
    }

    this.ctx.globalCompositeOperation = 'destination-out'
    for (let i = this.stamps.length - 1; i >= 0; i--) {
      const s = this.stamps[i]
      const t = (now - s.born) / LIFETIME
      if (t >= 1) {
        this.stamps.splice(i, 1)
        continue
      }
      hasStamps = true
      const ease = 1 - Math.pow(1 - t, 3)
      const r = R_START + (s.rmax - R_START) * ease
      const alpha = 1 - t * t
      this.carveInk(s.x, s.y, r, alpha, s.seed)
    }

    if (hasStamps || this.sourceCanvas) {
      this.rafId = requestAnimationFrame(this.tick)
    } else {
      this.running = false
      this.rafId = null
    }
  }

  private stopLoop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.running = false
  }

  private carveInk(x: number, y: number, r: number, alpha: number, seed: number) {
    const ctx = this.ctx
    const g = ctx.createRadialGradient(x, y, r * 0.25, x, y, r)
    g.addColorStop(0, 'rgba(0, 0, 0, ' + (0.95 * alpha).toFixed(3) + ')')
    g.addColorStop(0.55, 'rgba(0, 0, 0, ' + (0.88 * alpha).toFixed(3) + ')')
    g.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    const segs = 32
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2
      const wob =
        0.78 +
        0.14 * Math.sin(a * 3 + seed) +
        0.08 * Math.sin(a * 7 + seed * 2.1) +
        0.05 * Math.sin(a * 13 + seed * 0.7)
      const rr = r * wob
      const px = x + Math.cos(a) * rr
      const py = y + Math.sin(a) * rr
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
  }

  private hexToRgb(hex: string): string {
    const m = hex.replace('#', '')
    const full =
      m.length === 3
        ? m
            .split('')
            .map((c) => c + c)
            .join('')
        : m
    const num = parseInt(full, 16)
    return `${(num >> 16) & 255},${(num >> 8) & 255},${num & 255}`
  }
}

/**
 * 燃烧的泰达希尔 · 火焰粒子渲染器（浅色模式壁纸动效层）。
 *
 * 设计约束（交接文档核心要求：禁止镜头移动）：
 * - 静态底图（真实 CG 帧）由 <img> 承担，本渲染器只绘制"动"的部分：
 *   火星粒子、余烬、火光闪烁。底图与粒子层之间没有任何位移/缩放耦合。
 * - 粒子存储"图像归一化坐标 (u,v)"，每帧经 object-cover 变换映射到视口，
 *   任意视口/旋转/缩放下发射区始终精确对齐底图中的火焰区域。
 * - 参照 InkRevealRenderer 的 canvas/rAF/DPR/生命周期模式。
 */

export interface TeldrassilFireOptions {
  /** 底图固有像素尺寸（用于 object-cover 对齐计算） */
  imageWidth: number
  imageHeight: number
}

interface 火焰粒子 {
  u: number
  v: number
  /** 图像归一化坐标下的速度（每秒） */
  dv: number
  摇摆幅度: number
  摇摆频率: number
  相位: number
  尺寸: number
  年龄: number
  寿命: number
  /** 火星=true（亮、快、短命）；余烬=false（暗、慢、长命） */
  是火星: boolean
}

// 粒子数量上限：Canvas 2D 下 200 级别粒子无性能压力
const 火星数量 = 90
const 余烬数量 = 60

// 发射区域（底图归一化坐标，依据真实 CG 帧构图标定）
// 树冠大火焰云 / 树干火线 / 地面左右两处火焰
const 树冠区 = { u0: 0.25, u1: 0.75, v0: 0.03, v1: 0.42 }
const 树干区 = { u0: 0.4, u1: 0.6, v0: 0.42, v1: 0.72 }
const 地面区 = { u0: 0.0, u1: 1.0, v0: 0.86, v1: 1.0 }

export class TeldrassilFireRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly imageWidth: number
  private readonly imageHeight: number
  private rafId: number | null = null
  private dpr = 1
  private w = 0
  private h = 0
  private 粒子池: 火焰粒子[] = []
  private lastTime: number | null = null
  private running = false

  constructor(options: TeldrassilFireOptions) {
    this.imageWidth = options.imageWidth
    this.imageHeight = options.imageHeight

    this.canvas = document.createElement('canvas')
    this.canvas.className = 'teldrassil-fire-canvas'

    const ctx = this.canvas.getContext('2d', { alpha: true })
    if (!ctx) throw new Error('无法创建 2D context')
    this.ctx = ctx

    this.初始化粒子池()
    this.resize()
  }

  get element(): HTMLCanvasElement {
    return this.canvas
  }

  mount(container: HTMLElement) {
    container.appendChild(this.canvas)
    window.addEventListener('resize', this.resize)
    this.startLoop()
  }

  unmount() {
    window.removeEventListener('resize', this.resize)
    this.stopLoop()
    const parentNode = this.canvas.parentNode
    if (parentNode != null) {
      parentNode.removeChild(this.canvas)
    }
  }

  private 初始化粒子池() {
    this.粒子池 = []
    for (let i = 0; i < 火星数量; i++) {
      this.粒子池.push(this.生成粒子(true, Math.random()))
    }
    for (let i = 0; i < 余烬数量; i++) {
      this.粒子池.push(this.生成粒子(false, Math.random()))
    }
  }

  /** 随机生成一个粒子；进度入参用于初始化时打散年龄，避免同帧起爆 */
  private 生成粒子(是火星: boolean, 初始进度 = 0): 火焰粒子 {
    const 区 = 是火星 ? this.随机火焰区() : { u0: 0, u1: 1, v0: 0, v1: 1 }
    const 寿命 = 是火星 ? 1.6 + Math.random() * 2.2 : 5 + Math.random() * 6
    return {
      u: 区.u0 + Math.random() * (区.u1 - 区.u0),
      v: 区.v0 + Math.random() * (区.v1 - 区.v0),
      dv: 是火星 ? -(0.05 + Math.random() * 0.09) : -(0.008 + Math.random() * 0.02),
      摇摆幅度: 是火星 ? 0.004 + Math.random() * 0.01 : 0.002 + Math.random() * 0.006,
      摇摆频率: 0.6 + Math.random() * 1.6,
      相位: Math.random() * Math.PI * 2,
      尺寸: 是火星 ? 1.2 + Math.random() * 2.4 : 0.8 + Math.random() * 1.6,
      年龄: 初始进度 * 寿命,
      寿命,
      是火星,
    }
  }

  /** 火星发射区按面积加权随机（树冠为主，树干/地面点缀） */
  private 随机火焰区() {
    const r = Math.random()
    if (r < 0.7) return 树冠区
    if (r < 0.88) return 树干区
    return 地面区
  }

  /** object-cover 对齐：图像归一化坐标 → 视口像素坐标 */
  private 映射(u: number, v: number): { x: number; y: number; scale: number } {
    const s = Math.max(this.w / this.imageWidth, this.h / this.imageHeight)
    const dw = this.imageWidth * s
    const dh = this.imageHeight * s
    const ox = (this.w - dw) / 2
    const oy = (this.h - dh) / 2
    return { x: ox + u * dw, y: oy + v * dh, scale: s }
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
  }

  private startLoop() {
    if (!this.running) {
      this.running = true
      this.lastTime = null
      this.rafId = requestAnimationFrame(this.tick)
    }
  }

  private stopLoop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.running = false
  }

  private tick = (now: number) => {
    if (this.lastTime === null) this.lastTime = now
    const dt = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now

    const ctx = this.ctx
    ctx.clearRect(0, 0, this.w, this.h)

    // 火光闪烁：以树冠为中心的加亮光晕，alpha 随多频正弦呼吸（不触碰底图像素）
    this.绘制火光(now / 1000)

    for (const p of this.粒子池) {
      p.年龄 += dt
      if (p.年龄 >= p.寿命) {
        Object.assign(p, this.生成粒子(p.是火星))
        continue
      }
      p.v += p.dv * dt
      const sway = Math.sin(now / 1000 * p.摇摆频率 * Math.PI * 2 + p.相位) * p.摇摆幅度
      const t = p.年龄 / p.寿命
      const { x, y, scale } = this.映射(p.u + sway, p.v)
      this.绘制粒子(x, y, p, t, scale)
    }

    this.rafId = requestAnimationFrame(this.tick)
  }

  /** 多频正弦叠加的平滑闪烁值（0~1） */
  private 闪烁值(t: number): number {
    return (
      0.5 +
      0.5 *
        (Math.sin(t * 1.7) * 0.45 + Math.sin(t * 2.9 + 1.3) * 0.33 + Math.sin(t * 5.3 + 2.1) * 0.22)
    )
  }

  private 绘制火光(t: number) {
    const { x, y, scale } = this.映射(0.5, 0.24)
    const 半径 = 0.42 * this.imageWidth * scale
    const alpha = 0.028 + 0.05 * this.闪烁值(t)
    const g = this.ctx.createRadialGradient(x, y, 0, x, y, 半径)
    g.addColorStop(0, `rgba(255, 150, 50, ${alpha.toFixed(4)})`)
    g.addColorStop(0.5, `rgba(255, 100, 30, ${(alpha * 0.5).toFixed(4)})`)
    g.addColorStop(1, 'rgba(255, 80, 20, 0)')
    this.ctx.globalCompositeOperation = 'lighter'
    this.ctx.fillStyle = g
    this.ctx.fillRect(x - 半径, y - 半径, 半径 * 2, 半径 * 2)
    this.ctx.globalCompositeOperation = 'source-over'
  }

  private 绘制粒子(x: number, y: number, p: 火焰粒子, t: number, scale: number) {
    // 生命周期曲线：淡入 → 峰值 → 衰减熄灭
    const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85
    const r = p.尺寸 * scale * (p.是火星 ? 1 - t * 0.5 : 0.7 + 0.3 * Math.sin(t * Math.PI))
    if (r <= 0.1) return

    // 颜色随生命周期从亮黄白 → 橙 → 深红
    const cr = 255
    const cg = Math.round(200 - 140 * t)
    const cb = Math.round(120 - 110 * t)
    const a = (p.是火星 ? 0.85 : 0.5) * Math.max(alpha, 0)

    this.ctx.beginPath()
    this.ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${a.toFixed(3)})`
    this.ctx.arc(x, y, r, 0, Math.PI * 2)
    this.ctx.fill()

    // 火星带辉光（外圈半透明晕）
    if (p.是火星) {
      this.ctx.beginPath()
      this.ctx.fillStyle = `rgba(255, 140, 40, ${(a * 0.25).toFixed(3)})`
      this.ctx.arc(x, y, r * 2.4, 0, Math.PI * 2)
      this.ctx.fill()
    }
  }
}

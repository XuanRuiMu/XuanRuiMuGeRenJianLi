export interface 水墨显现选项 {
  启用?: boolean
  遮罩颜色?: string
  遮罩源画布?: HTMLCanvasElement | null
}

interface 墨点结构 {
  x: number
  y: number
  出生时刻: number
  种子: number
  rmax: number
}

const 起始半径 = 8
const 结束半径 = 128
const 半径浮动 = 0.45
const 存活时长 = 520
const 墨点步长 = 12
const 最大墨点数 = 160

export class 水墨显现渲染器 {
  private readonly 画布: HTMLCanvasElement
  private readonly 上下文: CanvasRenderingContext2D
  private 帧编号: number | null = null
  private 启用: boolean
  private readonly 遮罩颜色: string
  private readonly 遮罩颜色分量: string
  private readonly 遮罩源画布: HTMLCanvasElement | null
  private 像素比 = 1
  private w = 0
  private h = 0
  private 上次横坐标: number | null = null
  private 上次纵坐标: number | null = null
  private 墨点表: 墨点结构[] = []
  private 运行中 = false

  constructor(选项: 水墨显现选项 = {}) {
    this.启用 = 选项.启用 ?? true
    this.遮罩颜色 = 选项.遮罩颜色 ?? '#05060f'
    this.遮罩颜色分量 = this.十六进制转颜色(this.遮罩颜色)
    this.遮罩源画布 = 选项.遮罩源画布 ?? null

    this.画布 = document.createElement('canvas')
    this.画布.className = 'ink-reveal-overlay'
    this.画布.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;'

    const 上下文 = this.画布.getContext('2d', { alpha: true })
    if (!上下文) throw new Error('无法创建 2D context')
    this.上下文 = 上下文

    this.调整尺寸()
    this.填充遮罩()
  }

  挂载(容器: HTMLElement) {
    容器.appendChild(this.画布)
    window.addEventListener('resize', this.调整尺寸)

    if (this.遮罩源画布) {
      this.开始循环()
    }
  }

  卸载() {
    window.removeEventListener('resize', this.调整尺寸)
    this.停止循环()
    const parentNode = this.画布.parentNode
    if (parentNode != null) {
      parentNode.removeChild(this.画布)
    }
  }

  设置启用(启用: boolean) {
    this.启用 = 启用
    if (!启用) {
      this.上下文.clearRect(0, 0, this.画布.width, this.画布.height)
    } else {
      this.填充遮罩()
    }
  }

  onPointerMove(x: number, y: number) {
    if (!this.启用) return
    const 横坐标 = x
    const 纵坐标 = y

    if (this.上次横坐标 !== null && this.上次纵坐标 !== null) {
      const 横向增量 = 横坐标 - this.上次横坐标
      const 纵向增量 = 纵坐标 - this.上次纵坐标
      const dist = Math.hypot(横向增量, 纵向增量)
      const 步数 = Math.max(1, Math.ceil(dist / 墨点步长))
      for (let i = 1; i <= 步数; i++) {
        const t = i / 步数
        this.添加墨点(this.上次横坐标 + 横向增量 * t, this.上次纵坐标 + 纵向增量 * t)
      }
    } else {
      this.添加墨点(横坐标, 纵坐标)
    }

    this.上次横坐标 = 横坐标
    this.上次纵坐标 = 纵坐标
    this.开始循环()
  }

  onPointerLeave() {
    this.上次横坐标 = null
    this.上次纵坐标 = null
  }

  private 添加墨点(x: number, y: number) {
    if (this.墨点表.length >= 最大墨点数) this.墨点表.shift()
    this.墨点表.push({
      x,
      y,
      出生时刻: performance.now(),
      种子: Math.random() * Math.PI * 2,
      rmax: 结束半径 * (1 - 半径浮动 + Math.random() * 半径浮动),
    })
  }

  private 填充遮罩() {
    if (!this.启用) return
    this.上下文.globalCompositeOperation = 'source-over'
    if (this.遮罩源画布) {
      this.上下文.drawImage(this.遮罩源画布, 0, 0, this.w, this.h)
    } else {
      this.上下文.fillStyle = 'rgb(' + this.遮罩颜色分量 + ')'
      this.上下文.fillRect(0, 0, this.w, this.h)
    }
  }

  private 调整尺寸 = () => {
    const 粗指针 = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
    this.像素比 = Math.min(window.devicePixelRatio || 1, 粗指针 ? 1.5 : 2)
    this.w = window.innerWidth
    this.h = window.innerHeight
    this.画布.width = Math.round(this.w * this.像素比)
    this.画布.height = Math.round(this.h * this.像素比)
    this.画布.style.width = this.w + 'px'
    this.画布.style.height = this.h + 'px'
    this.上下文.setTransform(this.像素比, 0, 0, this.像素比, 0, 0)
    this.填充遮罩()
  }

  private 开始循环() {
    if (!this.运行中) {
      this.运行中 = true
      this.帧编号 = requestAnimationFrame(this.帧步进)
    }
  }

  private 帧步进 = () => {
    const 当前时刻 = performance.now()
    let 有墨点 = false

    this.上下文.globalCompositeOperation = 'source-over'

    if (this.遮罩源画布) {
      this.上下文.drawImage(this.遮罩源画布, 0, 0, this.w, this.h)
    } else {
      this.上下文.fillStyle = 'rgb(' + this.遮罩颜色分量 + ')'
      this.上下文.fillRect(0, 0, this.w, this.h)
    }

    this.上下文.globalCompositeOperation = 'destination-out'
    for (let i = this.墨点表.length - 1; i >= 0; i--) {
      const s = this.墨点表[i]
      const t = (当前时刻 - s.出生时刻) / 存活时长
      if (t >= 1) {
        this.墨点表.splice(i, 1)
        continue
      }
      有墨点 = true
      const 缓动 = 1 - Math.pow(1 - t, 3)
      const r = 起始半径 + (s.rmax - 起始半径) * 缓动
      const 透明度 = 1 - t * t
      this.擦出墨迹(s.x, s.y, r, 透明度, s.种子)
    }

    if (有墨点 || this.遮罩源画布) {
      this.帧编号 = requestAnimationFrame(this.帧步进)
    } else {
      this.运行中 = false
      this.帧编号 = null
    }
  }

  private 停止循环() {
    if (this.帧编号 !== null) {
      cancelAnimationFrame(this.帧编号)
      this.帧编号 = null
    }
    this.运行中 = false
  }

  private 擦出墨迹(x: number, y: number, r: number, 透明度: number, 种子: number) {
    const 上下文 = this.上下文
    const g = 上下文.createRadialGradient(x, y, r * 0.25, x, y, r)
    g.addColorStop(0, 'rgba(0, 0, 0, ' + (0.95 * 透明度).toFixed(3) + ')')
    g.addColorStop(0.55, 'rgba(0, 0, 0, ' + (0.88 * 透明度).toFixed(3) + ')')
    g.addColorStop(1, 'rgba(0, 0, 0, 0)')
    上下文.fillStyle = g
    上下文.beginPath()
    const segs = 32
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2
      const wob =
        0.78 +
        0.14 * Math.sin(a * 3 + 种子) +
        0.08 * Math.sin(a * 7 + 种子 * 2.1) +
        0.05 * Math.sin(a * 13 + 种子 * 0.7)
      const 半径 = r * wob
      const 横坐标 = x + Math.cos(a) * 半径
      const 纵坐标 = y + Math.sin(a) * 半径
      if (i === 0) 上下文.moveTo(横坐标, 纵坐标)
      else 上下文.lineTo(横坐标, 纵坐标)
    }
    上下文.closePath()
    上下文.fill()
  }

  private 十六进制转颜色(十六进制: string): string {
    const m = 十六进制.replace('#', '')
    const 完整 =
      m.length === 3
        ? m
            .split('')
            .map((c) => c + c)
            .join('')
        : m
    const 数值 = parseInt(完整, 16)
    return `${(数值 >> 16) & 255},${(数值 >> 8) & 255},${数值 & 255}`
  }
}

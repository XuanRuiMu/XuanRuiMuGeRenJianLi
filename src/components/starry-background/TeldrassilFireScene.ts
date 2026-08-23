/**
 * 「燃烧的泰达希尔」程序化 Canvas 场景 —— 浅色模式动态壁纸。
 *
 * 意象（魔兽世界8.0）：暮火天空下世界树树冠燃烧——火焰粒子上升、
 * 余烬飘散、火光辉光呼吸、烟霭上浮。
 *
 * 结构对齐 InkRevealRenderer：
 * - 静态离屏层（暮火天空渐变 + 世界树剪影）仅在构造与 resize 时重绘；
 * - 动态层每帧：drawImage 静态层 → 烟霭 → 火光辉光 → 火焰粒子 → 余烬；
 * - 性能红线：单 canvas 2D 显示；DPR=min(devicePixelRatio,1.75)；
 *   visibilitychange 停/复 rAF；destroy() 完整清理；对象池零 GC；
 *   reduced-motion 仅绘静态单帧，不启动动画循环。
 */

export interface TeldrassilFireSceneOptions {
  reducedMotion?: boolean
}

export const 火焰池上限 = 180
export const 余烬池上限 = 80

// 每秒发射速率（稳态下活跃数≈速率×平均寿命，收敛后由池上限封顶）
const 火焰发射速率 = 90 // 个/秒
const 余烬发射速率 = 30 // 个/秒
// 单帧发射积压上限：低帧率或卡顿恢复时防一次性补发过多
const 发射积压上限 = 8
// 呼吸脉动周期（毫秒）
const 光晕周期 = 4000

interface 火焰粒子 {
  存活: boolean
  x: number
  y: number
  上升速度: number
  摆幅: number
  摆频: number
  相位: number
  寿命: number
  总寿命: number
  半径: number
}

interface 余烬粒子 {
  存活: boolean
  x: number
  y: number
  上升速度: number
  漂移速度: number
  相位: number
  闪频: number
  寿命: number
  总寿命: number
  半径: number
}

interface 烟雾团 {
  x: number
  y: number
  半径: number
  上升速度: number
  漂移相位: number
}

// 固定种子伪随机：保证 resize 重绘时树形构图完全一致
function 创建伪随机(种子: number) {
  let 状态 = 种子 >>> 0
  return () => {
    状态 = (状态 + 0x6d2b79f5) >>> 0
    let t = 状态
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class TeldrassilFireScene {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly 静态层: HTMLCanvasElement
  private readonly 静态层ctx: CanvasRenderingContext2D
  private readonly reducedMotion: boolean
  private rafId: number | null = null
  private 已销毁 = false
  private dpr = 1
  private w = 0
  private h = 0
  private lastNow = 0
  private 火焰累积 = 0
  private 余烬累积 = 0

  private readonly 火焰池: 火焰粒子[] = []
  private readonly 余烬池: 余烬粒子[] = []
  private 火焰游标 = 0
  private 余烬游标 = 0
  private readonly 烟雾团列表: 烟雾团[] = []

  // 构图锚点（resize 时重算）
  private 地平线y = 0
  private 冠心x = 0
  private 冠心y = 0
  private 冠半径x = 0
  private 冠半径y = 0

  constructor(options: TeldrassilFireSceneOptions = {}) {
    this.reducedMotion = options.reducedMotion ?? false

    this.canvas = document.createElement('canvas')
    this.canvas.className = 'teldrassil-fire-canvas'
    this.canvas.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block;'

    const ctx = this.canvas.getContext('2d', { alpha: true })
    if (!ctx) throw new Error('无法创建 2D context')
    this.ctx = ctx

    this.静态层 = document.createElement('canvas')
    const 静态ctx = this.静态层.getContext('2d', { alpha: false })
    if (!静态ctx) throw new Error('无法创建离屏 2D context')
    this.静态层ctx = 静态ctx

    for (let i = 0; i < 火焰池上限; i++) {
      this.火焰池.push({
        存活: false, x: 0, y: 0, 上升速度: 0, 摆幅: 0, 摆频: 0,
        相位: 0, 寿命: 0, 总寿命: 1, 半径: 3,
      })
    }
    for (let i = 0; i < 余烬池上限; i++) {
      this.余烬池.push({
        存活: false, x: 0, y: 0, 上升速度: 0, 漂移速度: 0,
        相位: 0, 闪频: 0, 寿命: 0, 总寿命: 1, 半径: 2,
      })
    }

    this.resize()

    if (this.reducedMotion) {
      this.绘制静态帧()
      return
    }

    for (let i = 0; i < 3; i++) {
      this.烟雾团列表.push(this.创建烟雾团(i))
    }
    this.lastNow = performance.now()
    this.startLoop()
  }

  mount(container: HTMLElement) {
    container.appendChild(this.canvas)
    window.addEventListener('resize', this.resize)
    document.addEventListener('visibilitychange', this.处理可见性)
  }

  destroy() {
    this.已销毁 = true
    window.removeEventListener('resize', this.resize)
    document.removeEventListener('visibilitychange', this.处理可见性)
    this.stopLoop()
    const parentNode = this.canvas.parentNode
    if (parentNode != null) {
      parentNode.removeChild(this.canvas)
    }
  }

  获取粒子计数() {
    let 火 = 0
    for (const p of this.火焰池) if (p.存活) 火++
    let 尘 = 0
    for (const p of this.余烬池) if (p.存活) 尘++
    return { 火焰: 火, 余烬: 尘 }
  }

  /** 推进一帧（tick 内部调用；测试可手动驱动） */
  step(now: number) {
    if (this.reducedMotion || this.已销毁) return
    if (this.lastNow === 0) this.lastNow = now
    const dt = Math.min(Math.max(now - this.lastNow, 0), 50) / 1000
    this.lastNow = now

    const ctx = this.ctx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.w, this.h)
    ctx.drawImage(this.静态层, 0, 0, this.w, this.h)

    this.绘制烟雾(dt, now)
    this.绘制火光(now)
    this.更新发射(dt)
    this.更新并绘制火焰(dt, now)
    this.更新并绘制余烬(dt, now)
  }

  private startLoop() {
    if (this.reducedMotion || this.已销毁 || this.rafId !== null) return
    this.rafId = requestAnimationFrame(this.tick)
  }

  private stopLoop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private tick = () => {
    this.rafId = null
    if (this.已销毁) return
    this.step(performance.now())
    if (!this.已销毁) this.rafId = requestAnimationFrame(this.tick)
  }

  private 处理可见性 = () => {
    if (document.visibilityState === 'hidden') {
      this.stopLoop()
    } else {
      this.startLoop()
    }
  }

  private resize = () => {
    if (this.已销毁) return
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.75)
    // 容器即 .light-wallpaper（纵向各溢出 320px），canvas 铺满容器随视差整体位移
    const 容器 = this.canvas.parentNode as HTMLElement | null
    const cw = 容器?.clientWidth || window.innerWidth || 1
    const ch = 容器?.clientHeight || window.innerHeight || 1
    this.w = cw
    this.h = ch
    this.canvas.width = Math.round(this.w * this.dpr)
    this.canvas.height = Math.round(this.h * this.dpr)

    this.地平线y = this.h * 0.78
    this.冠心x = this.w * 0.5
    this.冠心y = this.h * 0.32
    this.冠半径x = Math.min(this.w * 0.26, this.h * 0.34)
    this.冠半径y = this.冠半径x * 0.62

    this.静态层.width = this.canvas.width
    this.静态层.height = this.canvas.height
    this.绘制静态层()

    if (this.reducedMotion) this.绘制静态帧()
  }

  /* ==================== 静态层：天空 + 世界树剪影 ==================== */

  private 绘制静态层() {
    const g = this.静态层ctx
    const w = this.w
    const h = this.h

    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    // 暮火天空：顶部暗蓝紫 → 中部橙红 → 底部暖金（中等亮度暖调，非黑夜）
    const 天空 = g.createLinearGradient(0, 0, 0, h)
    天空.addColorStop(0, '#2a1a3e')
    天空.addColorStop(0.42, '#8a4034')
    天空.addColorStop(0.68, '#c85a2a')
    天空.addColorStop(0.88, '#e8933c')
    天空.addColorStop(1, '#f0bd6a')
    g.fillStyle = 天空
    g.fillRect(0, 0, w, h)

    // 大地剪影（地平线位于画面下 22%）
    const 大地 = g.createLinearGradient(0, this.地平线y, 0, h)
    大地.addColorStop(0, '#3f2517')
    大地.addColorStop(1, '#170d08')
    g.fillStyle = 大地
    g.fillRect(0, this.地平线y, w, h - this.地平线y)

    this.绘制世界树(g)
  }

  private 绘制世界树(g: CanvasRenderingContext2D) {
    const rand = 创建伪随机(0x1eda71)
    const 树色 = '#1f1410'
    g.fillStyle = 树色
    g.strokeStyle = 树色
    g.lineCap = 'round'

    const 主干宽 = Math.max(16, Math.min(this.h * 0.05, 46))

    // 主干自地平线升起，向上收窄
    this.分枝(g, rand, this.冠心x, this.地平线y + this.h * 0.02, -Math.PI / 2 + 0.04, this.h * 0.3, 主干宽, 0)

    // 树冠巨大团簇轮廓：多个重叠椭圆簇
    const 簇数 = 9
    for (let i = 0; i < 簇数; i++) {
      const 角度 = (i / 簇数) * Math.PI * 2 + rand() * 0.6
      const 距离 = this.冠半径x * (0.15 + rand() * 0.55)
      const cx = this.冠心x + Math.cos(角度) * 距离
      const cy = this.冠心y + Math.sin(角度) * 距离 * 0.72
      this.画树冠簇(g, cx, cy, this.冠半径x * (0.28 + rand() * 0.22), rand)
    }
    this.画树冠簇(g, this.冠心x, this.冠心y, this.冠半径x * 0.55, rand)
  }

  /** 程序化分枝：主干贝塞尔 + 递归分枝，深层枝端生成小树冠簇 */
  private 分枝(
    g: CanvasRenderingContext2D,
    rand: () => number,
    x: number,
    y: number,
    角度: number,
    长度: number,
    宽度: number,
    深度: number
  ) {
    if (深度 > 4 || 宽度 < 1.2) return
    const 弯曲 = (rand() - 0.5) * 0.35
    const 端x = x + Math.cos(角度) * 长度
    const 端y = y + Math.sin(角度) * 长度
    const 控x = x + Math.cos(角度 + 弯曲) * 长度 * 0.55
    const 控y = y + Math.sin(角度 + 弯曲) * 长度 * 0.55

    g.lineWidth = 宽度
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(控x, 控y, 端x, 端y)
    g.stroke()

    if (深度 >= 3) {
      this.画树冠簇(g, 端x, 端y, this.冠半径x * (0.12 + rand() * 0.14), rand)
    } else {
      const 枝数 = 2
      for (let i = 0; i < 枝数; i++) {
        const 张角 = 0.28 + rand() * 0.5
        const 方向 = i === 0 ? -1 : 1
        this.分枝(
          g,
          rand,
          端x,
          端y,
          角度 + 方向 * 张角,
          长度 * (0.62 + rand() * 0.14),
          宽度 * 0.58,
          深度 + 1
        )
      }
      // 主干中段偶发第三枝，增强粗壮感
      if (深度 === 0 && rand() > 0.4) {
        this.分枝(
          g,
          rand,
          控x,
          控y,
          角度 + (rand() > 0.5 ? 1 : -1) * (0.7 + rand() * 0.4),
          长度 * 0.45,
          宽度 * 0.4,
          深度 + 2
        )
      }
    }
  }

  private 画树冠簇(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, rand: () => number) {
    g.beginPath()
    g.ellipse(cx, cy, r, r * 0.74, 0, 0, Math.PI * 2)
    g.fill()
    for (let i = 0; i < 2; i++) {
      const 偏角 = rand() * Math.PI * 2
      const 距 = r * (0.3 + rand() * 0.4)
      g.beginPath()
      g.ellipse(cx + Math.cos(偏角) * 距, cy + Math.sin(偏角) * 距 * 0.7, r * 0.6, r * 0.46, 0, 0, Math.PI * 2)
      g.fill()
    }
  }

  /* ==================== 动态层各元素 ==================== */

  private 创建烟雾团(序号: number): 烟雾团 {
    const rand = Math.random
    return {
      x: this.w * (0.2 + rand() * 0.6),
      y: this.地平线y - 序号 * this.h * 0.18 - rand() * this.h * 0.08,
      半径: this.h * (0.13 + rand() * 0.09),
      上升速度: this.h * (0.008 + rand() * 0.006),
      漂移相位: rand() * Math.PI * 2,
    }
  }

  private 绘制烟雾(dt: number, now: number) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'source-over'
    for (let i = 0; i < this.烟雾团列表.length; i++) {
      const s = this.烟雾团列表[i]
      s.y -= s.上升速度 * dt
      s.x += Math.sin(now / 5200 + s.漂移相位) * 6 * dt
      if (s.y < this.h * 0.06) this.烟雾团列表[i] = this.创建烟雾团(i)
      const 渐变 = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.半径)
      渐变.addColorStop(0, 'rgba(84, 72, 66, 0.07)')
      渐变.addColorStop(1, 'rgba(84, 72, 66, 0)')
      ctx.fillStyle = 渐变
      ctx.fillRect(s.x - s.半径, s.y - s.半径, s.半径 * 2, s.半径 * 2)
    }
  }

  private 绘制火光(now: number) {
    const ctx = this.ctx
    const 呼吸 = Math.sin((now / 光晕周期) * Math.PI * 2)
    const 半径 = this.冠半径x * (1.1 + 0.12 * 呼吸)
    const alpha = 0.16 + 0.09 * 呼吸
    ctx.globalCompositeOperation = 'lighter'
    const 渐变 = ctx.createRadialGradient(this.冠心x, this.冠心y, 0, this.冠心x, this.冠心y, 半径)
    渐变.addColorStop(0, `rgba(255, 168, 60, ${alpha.toFixed(3)})`)
    渐变.addColorStop(0.55, `rgba(255, 110, 30, ${(alpha * 0.5).toFixed(3)})`)
    渐变.addColorStop(1, 'rgba(255, 110, 30, 0)')
    ctx.fillStyle = 渐变
    ctx.fillRect(this.冠心x - 半径, this.冠心y - 半径, 半径 * 2, 半径 * 2)
    ctx.globalCompositeOperation = 'source-over'
  }

  private 更新发射(dt: number) {
    this.火焰累积 = Math.min(this.火焰累积 + dt * 火焰发射速率, 发射积压上限)
    while (this.火焰累积 >= 1) {
      if (!this.发射火焰()) {
        this.火焰累积 = 0
        break
      }
      this.火焰累积 -= 1
    }
    this.余烬累积 = Math.min(this.余烬累积 + dt * 余烬发射速率, 发射积压上限)
    while (this.余烬累积 >= 1) {
      if (!this.发射余烬()) {
        this.余烬累积 = 0
        break
      }
      this.余烬累积 -= 1
    }
  }

  // 树冠区域内加权随机取点（均匀盘采样）
  private 冠内随机点(): { x: number; y: number } {
    const 角度 = Math.random() * Math.PI * 2
    const 距 = Math.sqrt(Math.random())
    return {
      x: this.冠心x + Math.cos(角度) * 距 * this.冠半径x,
      y: this.冠心y + Math.sin(角度) * 距 * this.冠半径y,
    }
  }

  private 发射火焰(): boolean {
    for (let i = 0; i < 火焰池上限; i++) {
      this.火焰游标 = (this.火焰游标 + 1) % 火焰池上限
      const p = this.火焰池[this.火焰游标]
      if (!p.存活) {
        const 点 = this.冠内随机点()
        p.存活 = true
        p.x = 点.x
        p.y = 点.y
        p.上升速度 = this.h * (0.02 + Math.random() * 0.03)
        p.摆幅 = 8 + Math.random() * 26
        p.摆频 = 0.001 + Math.random() * 0.002
        p.相位 = Math.random() * Math.PI * 2
        p.总寿命 = 1400 + Math.random() * 1600
        p.寿命 = p.总寿命
        p.半径 = 2 + Math.random() * 4
        return true
      }
    }
    return false
  }

  private 发射余烬(): boolean {
    for (let i = 0; i < 余烬池上限; i++) {
      this.余烬游标 = (this.余烬游标 + 1) % 余烬池上限
      const p = this.余烬池[this.余烬游标]
      if (!p.存活) {
        const 点 = this.冠内随机点()
        p.存活 = true
        p.x = 点.x
        p.y = 点.y
        p.上升速度 = this.h * (0.04 + Math.random() * 0.06)
        p.漂移速度 = (Math.random() - 0.35) * this.w * 0.012
        p.相位 = Math.random() * Math.PI * 2
        p.闪频 = 0.006 + Math.random() * 0.012
        p.总寿命 = 2600 + Math.random() * 3200
        p.寿命 = p.总寿命
        p.半径 = 1 + Math.random() * 2
        return true
      }
    }
    return false
  }

  private 更新并绘制火焰(dt: number, now: number) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'lighter'
    for (const p of this.火焰池) {
      if (!p.存活) continue
      p.寿命 -= dt * 1000
      if (p.寿命 <= 0) {
        p.存活 = false
        continue
      }
      p.y -= p.上升速度 * dt
      p.x += Math.sin(p.相位 + now * p.摆频) * p.摆幅 * dt
      const 比 = p.寿命 / p.总寿命
      const alpha = Math.min(1, 比 * 1.5) * 0.85
      const r = p.半径 * (0.5 + 0.5 * 比)
      // 金 → 橙 → 红 → 透明淡出
      const 色 =
        比 > 0.66 ? '255, 210, 122' : 比 > 0.33 ? '255, 140, 46' : '226, 69, 31'
      ctx.beginPath()
      ctx.arc(p.x, p.y, r * 2.2, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${色}, ${(alpha * 0.22).toFixed(3)})`
      ctx.fill()
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${色}, ${alpha.toFixed(3)})`
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  private 更新并绘制余烬(dt: number, now: number) {
    const ctx = this.ctx
    ctx.globalCompositeOperation = 'lighter'
    for (const p of this.余烬池) {
      if (!p.存活) continue
      p.寿命 -= dt * 1000
      if (p.寿命 <= 0) {
        p.存活 = false
        continue
      }
      p.y -= p.上升速度 * dt
      p.x += (p.漂移速度 + Math.sin(p.相位 + now * p.闪频) * 10) * dt
      const 比 = p.寿命 / p.总寿命
      const 闪烁 = 0.55 + 0.45 * Math.sin(now * p.闪频 + p.相位)
      const alpha = Math.min(1, 比 * 1.6) * 闪烁 * 0.9
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.半径, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 217, 138, ${alpha.toFixed(3)})`
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  /* ==================== reduced-motion 静态单帧 ==================== */

  private 绘制静态帧() {
    const ctx = this.ctx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.w, this.h)
    ctx.drawImage(this.静态层, 0, 0, this.w, this.h)

    // 一次固定强度火光
    ctx.globalCompositeOperation = 'lighter'
    const 半径 = this.冠半径x * 1.1
    const 渐变 = ctx.createRadialGradient(this.冠心x, this.冠心y, 0, this.冠心x, this.冠心y, 半径)
    渐变.addColorStop(0, 'rgba(255, 168, 60, 0.2)')
    渐变.addColorStop(1, 'rgba(255, 110, 30, 0)')
    ctx.fillStyle = 渐变
    ctx.fillRect(this.冠心x - 半径, this.冠心y - 半径, 半径 * 2, 半径 * 2)
    ctx.globalCompositeOperation = 'source-over'

    // 少量静态火点（固定种子保证构图稳定）
    const rand = 创建伪随机(0xf11e)
    for (let i = 0; i < 24; i++) {
      const 点 = this.冠内加权静态点(rand)
      ctx.beginPath()
      ctx.arc(点.x, 点.y, 1.5 + rand() * 3, 0, Math.PI * 2)
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255, 210, 122, 0.8)' : 'rgba(255, 140, 46, 0.75)'
      ctx.fill()
    }
  }

  private 冠内加权静态点(rand: () => number) {
    const 角度 = rand() * Math.PI * 2
    const 距 = Math.sqrt(rand())
    return {
      x: this.冠心x + Math.cos(角度) * 距 * this.冠半径x,
      y: this.冠心y + Math.sin(角度) * 距 * this.冠半径y,
    }
  }
}

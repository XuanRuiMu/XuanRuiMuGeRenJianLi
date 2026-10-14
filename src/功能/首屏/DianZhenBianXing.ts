/**
 * 技术栈 ASCII 点阵变形动画 · 移植自参考站（bilibilitoy wujisuan-ai-test）motion.js 的 mountLogo。
 *
 * 原理：图标光栅化为 512px alpha 掩码并裁出墨迹包围盒 → 自适应网格（cell=max(5.3,min(w/66,h/62))）
 * 对每格 3×3 超采样，ink>0.23 处生成字符点 {x,y,alpha=0.48+ink*0.46,glyph,seed} →
 * 切换时目标点按 seed 序贪心配对最近源点，未配对源点上飘淡出、新点自下方升入，
 * 延迟=(x/w)*0.13 形成左→右波，弯曲=sin(seed)*min(12,距离*0.05) 走弧线，smoothstep 缓动 1.25s，
 * 字形在过半程时切换；指针接近产生高斯衰减的径向涟漪；页面隐藏暂停，reduced-motion 静态化。
 */

const 变形时长秒 = 1.25
const 自动切换间隔秒 = 5
const 涟漪半径上限 = 135
const 指针跟随速率 = 12
const 光栅尺寸 = 512

export interface 点阵图标定义 {
  id: string
  name: string
  /** 组成 Logo 形体的主字符（取技术名首字母） */
  glyph: string
  src: string
  /** 带整面底色的图标（如蓝底白字）需声明提取模式，默认 alpha 只看透明度 */
  掩码模式?: 'alpha' | 'light' | 'dark'
}

export interface 已载图标 {
  id: string
  name: string
  glyph: string
  mask: Float32Array
  width: number
  height: number
  left: number
  top: number
  bw: number
  bh: number
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export interface 点 {
  x: number
  y: number
  alpha: number
  glyph: string
  seed: number
}

export interface 变形对 {
  from: 点
  to: 点
  delay: number
  bend: number
}

export interface 变形状态 {
  pairs: 变形对[]
  起始时间: number
}

export function 平滑步进(v: number): number {
  const t = Math.max(0, Math.min(1, v))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

export function 技术字形(name: string): string {
  const 首字 = name.trim()[0]
  return 首字 ? 首字.toUpperCase() : '#'
}

/**
 * 给只有 viewBox 的 SVG 根标签注入 512×512 宽高：部分浏览器对无内在尺寸的 SVG
 * 绘制到 canvas 时会得到 0×0，无法光栅化。默认 preserveAspectRatio=meet，
 * 等比缩放居中，留白透明不影响掩码。
 */
export function 注入svg尺寸(svg文本: string): string {
  const 开标签 = /<svg\b[^>]*>/i.exec(svg文本)
  if (!开标签) return svg文本
  const 视框 = /viewBox\s*=\s*["']([^"']+)["']/i.exec(开标签[0])
  if (!视框) return svg文本
  const 数值 = 视框[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  if (数值.length !== 4 || 数值.some((n) => !Number.isFinite(n)) || 数值[2] <= 0 || 数值[3] <= 0) {
    return svg文本
  }
  let 标签 = 开标签[0].replace(/\s(width|height)\s*=\s*["'][^"']*["']/gi, '')
  标签 = 标签.replace(/<svg/i, '<svg width="512" height="512"')
  return svg文本.slice(0, 开标签.index) + 标签 + svg文本.slice(开标签.index + 开标签[0].length)
}

export interface 墨迹掩码 {
  mask: Float32Array
  width: number
  height: number
  left: number
  top: number
  bw: number
  bh: number
}

/** 从光栅像素提取墨迹掩码，并计算墨迹（>0.2）包围盒；全空时抛错。
 *  模式 alpha：透明度即墨量；light：只保留高亮像素（蓝底白字类图标提取白色字样，同参考站）；
 *  dark：只保留暗像素（亮底深字类图标的反向提取）。 */
export function 构建墨迹掩码(
  rgba: Uint8ClampedArray,
  宽: number,
  高: number,
  模式: 'alpha' | 'light' | 'dark' = 'alpha'
): 墨迹掩码 {
  const mask = new Float32Array(宽 * 高)
  let left = 宽
  let top = 高
  let right = 0
  let bottom = 0
  for (let i = 0; i < mask.length; i++) {
    const a = rgba[i * 4 + 3] / 255
    let ink = a
    if (模式 !== 'alpha') {
      const 亮度 = (rgba[i * 4] * 0.2126 + rgba[i * 4 + 1] * 0.7152 + rgba[i * 4 + 2] * 0.0722) / 255
      ink = a * (模式 === 'light' ? clamp01((亮度 - 0.5) * 2) : clamp01((0.5 - 亮度) * 2))
    }
    mask[i] = ink
    if (ink > 0.2) {
      const x = i % 宽
      const y = Math.floor(i / 宽)
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
  }
  if (left > right || top > bottom) throw new Error('图标掩码为空')
  return { mask, width: 宽, height: 高, left, top, bw: right - left + 1, bh: bottom - top + 1 }
}

/** 把图标掩码铺到画布网格上，生成字符点阵（3×3 超采样保住细笔画与镂空） */
export function 构建点阵(logo: 已载图标, 宽: number, 高: number, cell: number): 点[] {
  const scale = Math.min((宽 * 0.84) / logo.bw, (高 * 0.78) / logo.bh)
  const 图宽 = logo.bw * scale
  const 图高 = logo.bh * scale
  const x0 = (宽 - 图宽) / 2
  const y0 = (高 - 图高) / 2
  const points: 点[] = []
  for (let y = cell / 2; y < 高; y += cell) {
    for (let x = cell / 2; x < 宽; x += cell) {
      const u = (x - x0) / scale + logo.left
      const v = (y - y0) / scale + logo.top
      if (u < logo.left || u >= logo.left + logo.bw || v < logo.top || v >= logo.top + logo.bh) continue
      let ink = 0
      for (const dx of [-0.24, 0, 0.24]) {
        for (const dy of [-0.24, 0, 0.24]) {
          const sx = Math.round(u + (dx * cell) / scale)
          const sy = Math.round(v + (dy * cell) / scale)
          if (sx >= 0 && sx < logo.width && sy >= 0 && sy < logo.height) {
            ink += logo.mask[sy * logo.width + sx] / 9
          }
        }
      }
      if (ink < 0.23) continue
      const seed = (Math.round(x / cell) * 127 + Math.round(y / cell) * 43) % 101
      const glyph = ink < 0.55 ? '+' : seed % 11 === 0 ? '#' : seed % 9 === 0 ? '*' : logo.glyph
      points.push({ x, y, alpha: 0.48 + ink * 0.46, glyph, seed })
    }
  }
  return points
}

/**
 * 变形配对：目标点按 seed 序贪心认领最近源点（距离平方 <0.01 短路，保留邻近字形身份）；
 * 剩余源点原地向上 2 格淡出；无源可认领的目标点自下方 2 格升入。
 */
export function 配对变形(from: 点[], 目标: 点[], 画布宽: number, cell: number): 变形对[] {
  const remaining = new Set(from.map((_, i) => i))
  const pairs: 变形对[] = []
  for (const to of [...目标].sort((a, b) => a.seed - b.seed)) {
    let best = -1
    let distance = Infinity
    for (const i of remaining) {
      const p = from[i]
      const d = (p.x - to.x) ** 2 + (p.y - to.y) ** 2
      if (d < distance) {
        distance = d
        best = i
      }
      if (d < 0.01) break
    }
    const start = best < 0 ? { ...to, y: to.y + cell * 2, alpha: 0 } : from[best]
    remaining.delete(best)
    pairs.push({
      from: start,
      to,
      delay: (to.x / 画布宽) * 0.13,
      bend: Math.sin(to.seed) * Math.min(12, Math.hypot(start.x - to.x, start.y - to.y) * 0.05),
    })
  }
  for (const i of remaining) {
    const start = from[i]
    pairs.push({
      from: start,
      to: { ...start, y: start.y - cell * 2, alpha: 0 },
      delay: (start.x / 画布宽) * 0.13,
      bend: 0,
    })
  }
  return pairs
}

/** 取当前帧点位；变形进行中按缓动插值，结束后返回目标静止点 */
export function 采帧(静止点: 点[], 变形: 变形状态 | null, 当前时间: number): { 点: 点[]; 完成: boolean } {
  if (!变形) return { 点: 静止点, 完成: false }
  const progress = (当前时间 - 变形.起始时间) / 变形时长秒
  if (progress >= 1) return { 点: 静止点, 完成: true }
  return {
    完成: false,
    点: 变形.pairs.map(({ from, to, delay, bend }) => {
      const e = 平滑步进((progress - delay) / (1 - delay))
      const arc = Math.sin(e * Math.PI) * bend
      return {
        x: from.x + (to.x - from.x) * e + arc,
        y: from.y + (to.y - from.y) * e - arc * 0.4,
        alpha: from.alpha + (to.alpha - from.alpha) * e,
        glyph: e < 0.5 ? from.glyph : to.glyph,
        seed: to.seed,
      }
    }),
  }
}

export interface 变形器选项 {
  /** reduced-motion：不自动切换、不做过渡动画，点击瞬切 */
  静态?: boolean
  /** 字符颜色（随主题切换） */
  颜色?: string
  /** 序号变更/加载完成时回调；名称用于映射技术卡数据 */
  on序号变更?: (序号: number, 名称: string, 总数: number) => void
  on加载失败?: () => void
}

export interface 点阵变形器 {
  切换(): void
  设颜色(颜色: string): void
  设静态(静态: boolean): void
  销毁(): void
}

const 掩码缓存 = new Map<string, Promise<已载图标>>()

async function 解析可光栅化地址(src: string): Promise<string> {
  if (!/\.svg(\?|$)/i.test(src)) return src
  try {
    const resp = await fetch(src)
    if (!resp.ok) return src
    const 原文 = await resp.text()
    const 注入后 = 注入svg尺寸(原文)
    if (注入后 === 原文) return src
    return URL.createObjectURL(new Blob([注入后], { type: 'image/svg+xml' }))
  } catch {
    return src
  }
}

async function 实际载入图标(定义: 点阵图标定义): Promise<已载图标> {
  const img = new Image()
  const 地址 = await 解析可光栅化地址(定义.src)
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('图标加载失败：' + 定义.src))
      img.src = 地址
    })
    const 光栅 = document.createElement('canvas')
    const scale = 光栅尺寸 / Math.max(img.naturalWidth, img.naturalHeight)
    const 宽 = (光栅.width = Math.max(1, Math.round(img.naturalWidth * scale)))
    const 高 = (光栅.height = Math.max(1, Math.round(img.naturalHeight * scale)))
    const ctx = 光栅.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('离屏画布不可用')
    ctx.drawImage(img, 0, 0, 宽, 高)
    const 掩码 = 构建墨迹掩码(ctx.getImageData(0, 0, 宽, 高).data, 宽, 高, 定义.掩码模式)
    return { id: 定义.id, name: 定义.name, glyph: 定义.glyph, ...掩码 }
  } finally {
    if (地址 !== 定义.src) URL.revokeObjectURL(地址)
  }
}

function 载入图标(定义: 点阵图标定义): Promise<已载图标> {
  // 缓存键必须含掩码模式：同一图标可能以不同模式分别提取
  const 键 = `${定义.src}::${定义.掩码模式 ?? 'alpha'}`
  let 缓存 = 掩码缓存.get(键)
  if (!缓存) {
    // 失败即逐出缓存，下次挂载可重试，避免长驻 SPA 永久复用一次瞬态失败
    缓存 = 实际载入图标(定义).catch((错误: unknown) => {
      掩码缓存.delete(键)
      throw 错误
    })
    掩码缓存.set(键, 缓存)
  }
  return 缓存
}

export function 创建点阵变形器(
  画布: HTMLCanvasElement,
  定义列表: 点阵图标定义[],
  选项: 变形器选项 = {}
): 点阵变形器 | null {
  const 原始ctx = 画布.getContext('2d')
  if (!原始ctx || 定义列表.length === 0) return null
  const ctx: CanvasRenderingContext2D = 原始ctx

  let 已销毁 = false
  let 已载: 已载图标[] = []
  let 形态: 点[][] = []
  let 当前序号 = 0
  let 静止点: 点[] = []
  let 变形: 变形状态 | null = null
  let 静态 = 选项.静态 ?? false
  let 颜色 = 选项.颜色 ?? '#cfe6ff'
  let w = 0
  let h = 0
  let cell = 9
  let 时间 = 0
  let 上次时钟 = 0
  let 自动切换时刻 = 自动切换间隔秒
  let 脏 = true
  let 可见 = true
  let raf句柄 = 0
  let 上次帧 = 0
  let 帧调度中 = false
  let 帧执行中 = false
  const 指针 = { x: 0, y: 0, 目标x: 0, 目标y: 0, 强度: 0, 激活: false }

  function wake() {
    // 帧执行期间（切换/观察器回调触发 wake）不得重复排帧，否则循环数倍增、动画指数加速
    if (帧调度中 || 帧执行中 || 已销毁) return
    上次帧 = 0
    帧调度中 = true
    raf句柄 = requestAnimationFrame(帧循环)
  }

  function 帧循环(stamp: number) {
    帧调度中 = false
    帧执行中 = true
    const dt = 上次帧 ? (stamp - 上次帧) / 1000 : 0
    上次帧 = stamp
    if (!静态 && !document.hidden) 时间 += dt
    绘制(时间)
    帧执行中 = false
    // 静态化、离屏或页面隐藏时停止调度，由事件（wake/唤醒/观察器回调）重新驱动
    if (!已销毁 && !静态 && 可见 && !document.hidden) {
      帧调度中 = true
      raf句柄 = requestAnimationFrame(帧循环)
    } else {
      raf句柄 = 0
    }
  }

  function 切换() {
    if (已载.length < 2 || !形态.length) return
    // 上一场变形若已到时长，先落定为目标形态，避免从旧形态起飞
    if (变形 && 采帧(静止点, 变形, 时间).完成) {
      静止点 = 形态[当前序号]
      变形 = null
    }
    const from = 采帧(静止点, 变形, 时间).点.filter((p) => p.alpha > 0.03)
    当前序号 = (当前序号 + 1) % 已载.length
    自动切换时刻 = 时间 + 自动切换间隔秒
    选项.on序号变更?.(当前序号, 已载[当前序号].name, 已载.length)
    if (静态) {
      静止点 = 形态[当前序号]
      变形 = null
      画布.dataset.transition = 'idle'
    } else {
      变形 = { pairs: 配对变形(from, 形态[当前序号], w, cell), 起始时间: 时间 }
      画布.dataset.transition = 'morphing'
    }
    脏 = true
    wake()
  }

  function 绘制(t: number) {
    const dt = !静态 ? Math.max(0, t - 上次时钟) : 0
    上次时钟 = t
    if (!w || !h || !已载.length) return
    if (!静态 && 时间 >= 自动切换时刻) 切换()
    if (!变形 && !指针.激活 && 指针.强度 < 0.0001 && !脏) return
    const ease = 1 - Math.exp(-dt * 指针跟随速率)
    指针.强度 += ((指针.激活 ? 1 : 0) - 指针.强度) * ease
    指针.x += (指针.目标x - 指针.x) * ease
    指针.y += (指针.目标y - 指针.y) * ease
    ctx.clearRect(0, 0, w, h)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `600 ${cell * 0.86}px "Cascadia Mono",Consolas,monospace`
    ctx.fillStyle = 颜色
    const radius = Math.min(涟漪半径上限, w * 0.26)
    let 帧 = 采帧(静止点, 变形, 时间)
    if (变形 && 帧.完成) {
      // 落定帧必须画出新形态：若仍画旧帧，画面会弹回上一图标并因空闲早退卡死在该画面
      静止点 = 形态[当前序号]
      变形 = null
      画布.dataset.transition = 'idle'
      帧 = { 点: 静止点, 完成: true }
    }
    for (const p of 帧.点) {
      if (p.alpha < 0.015) continue
      const dx = p.x - 指针.x
      const dy = p.y - 指针.y
      const d = Math.hypot(dx, dy)
      const influence = Math.exp(-((d / radius) ** 2)) * 指针.强度
      const ripple = Math.sin(d * 0.066 - 时间 * 4.2) * 3.1 * influence
      ctx.globalAlpha = clamp01(p.alpha + influence * 0.12)
      ctx.fillText(p.glyph, p.x + (dx / (d || 1)) * ripple, p.y + (dy / (d || 1)) * ripple)
    }
    ctx.globalAlpha = 1
    脏 = false
  }

  function 重算尺寸() {
    const box = 画布.getBoundingClientRect()
    w = box.width
    h = box.height
    const dpr = Math.min(2, devicePixelRatio || 1)
    画布.width = Math.round(w * dpr)
    画布.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    cell = Math.max(5.3, Math.min(w / 66, h / 62))
    形态 = 已载.map((logo) => 构建点阵(logo, w, h, cell))
    静止点 = 形态[当前序号] || []
    变形 = null
    画布.dataset.transition = 'idle'
    脏 = true
    wake()
  }

  function 移动(e: PointerEvent) {
    const r = 画布.getBoundingClientRect()
    指针.目标x = e.clientX - r.left
    指针.目标y = e.clientY - r.top
    if (!指针.激活) {
      指针.x = 指针.目标x
      指针.y = 指针.目标y
    }
    指针.激活 = true
  }

  function 离开() {
    指针.激活 = false
  }

  const 尺寸观察 = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(重算尺寸) : null
  尺寸观察?.observe(画布)
  const 可见观察 =
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(
          (entries) => {
            可见 = entries[0].isIntersecting
            上次时钟 = 时间
            if (可见) {
              脏 = true
              wake()
            }
          },
          { rootMargin: '40px' }
        )
      : null
  可见观察?.observe(画布)

  const 宿主按钮: HTMLElement = (画布.closest('button') as HTMLButtonElement | null) ?? 画布
  宿主按钮.addEventListener('click', 切换)
  宿主按钮.addEventListener('pointermove', 移动, { passive: true })
  宿主按钮.addEventListener('pointerleave', 离开)
  document.addEventListener('visibilitychange', 唤醒)

  function 唤醒() {
    if (!document.hidden) {
      上次时钟 = 时间
      wake()
    }
  }

  void Promise.allSettled(定义列表.map(载入图标)).then((results) => {
    if (已销毁) return
    const 失败项 = results.filter((r) => r.status === 'rejected')
    已载 = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
    // 部分图标失败同样上报：否则缺一个图标会静默少一张卡，用户与排查都无从发现
    if (!已载.length || 失败项.length) {
      选项.on加载失败?.()
    }
    if (!已载.length) return
    选项.on序号变更?.(0, 已载[0].name, 已载.length)
    // 加载期间 时间 已在累积，从加载完成时刻重新起算自动切换，保证首个图标完整展示一个周期
    自动切换时刻 = 时间 + 自动切换间隔秒
    重算尺寸()
    画布.dataset.ready = 'true'
  })

  return {
    切换,
    设颜色(v: string) {
      颜色 = v
      脏 = true
      wake()
    },
    设静态(v: boolean) {
      静态 = v
      // 变形进行中进入静态时冻结当前画面，transition 状态保持 morphing 以与内部一致
      if (!变形) 画布.dataset.transition = 'idle'
      脏 = true
      wake()
    },
    销毁() {
      已销毁 = true
      if (raf句柄) cancelAnimationFrame(raf句柄)
      raf句柄 = 0
      帧调度中 = false
      帧执行中 = false
      尺寸观察?.disconnect()
      可见观察?.disconnect()
      宿主按钮.removeEventListener('click', 切换)
      宿主按钮.removeEventListener('pointermove', 移动)
      宿主按钮.removeEventListener('pointerleave', 离开)
      document.removeEventListener('visibilitychange', 唤醒)
    },
  }
}

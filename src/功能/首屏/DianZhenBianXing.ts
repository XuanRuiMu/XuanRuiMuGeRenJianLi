const 变形时长秒 = 1.25
const 自动切换间隔秒 = 5
const 涟漪半径上限 = 135
const 指针跟随速率 = 12
const 光栅尺寸 = 512

export interface 点阵图标定义 {
  id: string
  name: string

  字形: string
  src: string

  掩码模式?: 'alpha' | 'light' | 'dark'
}

export interface 已载图标 {
  id: string
  name: string
  字形: string
  遮罩: Float32Array
  width: number
  height: number
  左边界: number
  上边界: number
  bw: number
  bh: number
}

const 钳制到零一 = (v: number) => Math.max(0, Math.min(1, v))

export interface 点 {
  x: number
  y: number
  透明度: number
  字形: string
  种子: number
}

export interface 变形对 {
  起点: 点
  终点: 点
  延迟: number
  弯曲: number
}

export interface 变形状态 {
  键值对表: 变形对[]
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
  遮罩: Float32Array
  width: number
  height: number
  左边界: number
  上边界: number
  bw: number
  bh: number
}

export function 构建墨迹掩码(
  透明颜色: Uint8ClampedArray,
  宽: number,
  高: number,
  模式: 'alpha' | 'light' | 'dark' = 'alpha'
): 墨迹掩码 {
  const 遮罩 = new Float32Array(宽 * 高)
  let 左边界 = 宽
  let 上边界 = 高
  let 右边界 = 0
  let 下边界 = 0
  for (let i = 0; i < 遮罩.length; i++) {
    const a = 透明颜色[i * 4 + 3] / 255
    let 墨迹 = a
    if (模式 !== 'alpha') {
      const 亮度 = (透明颜色[i * 4] * 0.2126 + 透明颜色[i * 4 + 1] * 0.7152 + 透明颜色[i * 4 + 2] * 0.0722) / 255
      墨迹 = a * (模式 === 'light' ? 钳制到零一((亮度 - 0.5) * 2) : 钳制到零一((0.5 - 亮度) * 2))
    }
    遮罩[i] = 墨迹
    if (墨迹 > 0.2) {
      const x = i % 宽
      const y = Math.floor(i / 宽)
      if (x < 左边界) 左边界 = x
      if (x > 右边界) 右边界 = x
      if (y < 上边界) 上边界 = y
      if (y > 下边界) 下边界 = y
    }
  }
  if (左边界 > 右边界 || 上边界 > 下边界) throw new Error('图标掩码为空')
  return {
    遮罩,
    width: 宽,
    height: 高,
    左边界: 左边界,
    上边界: 上边界,
    bw: 右边界 - 左边界 + 1,
    bh: 下边界 - 上边界 + 1,
  }
}

export function 构建点阵(标志: 已载图标, 宽: number, 高: number, 格: number): 点[] {
  const 缩放 = Math.min((宽 * 0.84) / 标志.bw, (高 * 0.78) / 标志.bh)
  const 图宽 = 标志.bw * 缩放
  const 图高 = 标志.bh * 缩放
  const x0 = (宽 - 图宽) / 2
  const y0 = (高 - 图高) / 2
  const 点集: 点[] = []
  for (let y = 格 / 2; y < 高; y += 格) {
    for (let x = 格 / 2; x < 宽; x += 格) {
      const u = (x - x0) / 缩放 + 标志.左边界
      const v = (y - y0) / 缩放 + 标志.上边界
      if (u < 标志.左边界 || u >= 标志.左边界 + 标志.bw || v < 标志.上边界 || v >= 标志.上边界 + 标志.bh) continue
      let 墨迹 = 0
      for (const 横向增量 of [-0.24, 0, 0.24]) {
        for (const 纵向增量 of [-0.24, 0, 0.24]) {
          const 源横坐标 = Math.round(u + (横向增量 * 格) / 缩放)
          const 源纵坐标 = Math.round(v + (纵向增量 * 格) / 缩放)
          if (源横坐标 >= 0 && 源横坐标 < 标志.width && 源纵坐标 >= 0 && 源纵坐标 < 标志.height) {
            墨迹 += 标志.遮罩[源纵坐标 * 标志.width + 源横坐标] / 9
          }
        }
      }
      if (墨迹 < 0.23) continue
      const 种子 = (Math.round(x / 格) * 127 + Math.round(y / 格) * 43) % 101
      const 字形 = 墨迹 < 0.55 ? '+' : 种子 % 11 === 0 ? '#' : 种子 % 9 === 0 ? '*' : 标志.字形
      点集.push({ x, y, 透明度: 0.48 + 墨迹 * 0.46, 字形, 种子: 种子 })
    }
  }
  return 点集
}

export function 配对变形(起点: 点[], 目标: 点[], 画布宽: number, 格: number): 变形对[] {
  const 剩余 = new Set(起点.map((_, i) => i))
  const 键值对表: 变形对[] = []
  for (const 终点 of [...目标].sort((a, b) => a.种子 - b.种子)) {
    let 最优 = -1
    let 距离 = Infinity
    for (const i of 剩余) {
      const p = 起点[i]
      const d = (p.x - 终点.x) ** 2 + (p.y - 终点.y) ** 2
      if (d < 距离) {
        距离 = d
        最优 = i
      }
      if (d < 0.01) break
    }
    const 开始 = 最优 < 0 ? { ...终点, y: 终点.y + 格 * 2, 透明度: 0 } : 起点[最优]
    剩余.delete(最优)
    键值对表.push({
      起点: 开始,
      终点: 终点,
      延迟: (终点.x / 画布宽) * 0.13,
      弯曲: Math.sin(终点.种子) * Math.min(12, Math.hypot(开始.x - 终点.x, 开始.y - 终点.y) * 0.05),
    })
  }
  for (const i of 剩余) {
    const 开始 = 起点[i]
    键值对表.push({
      起点: 开始,
      终点: { ...开始, y: 开始.y - 格 * 2, 透明度: 0 },
      延迟: (开始.x / 画布宽) * 0.13,
      弯曲: 0,
    })
  }
  return 键值对表
}

export function 采帧(静止点: 点[], 变形: 变形状态 | null, 当前时间: number): { 点: 点[]; 完成: boolean } {
  if (!变形) return { 点: 静止点, 完成: false }
  const 进度 = (当前时间 - 变形.起始时间) / 变形时长秒
  if (进度 >= 1) return { 点: 静止点, 完成: true }
  return {
    完成: false,
    点: 变形.键值对表.map(({ 起点, 终点, 延迟, 弯曲 }) => {
      const e = 平滑步进((进度 - 延迟) / (1 - 延迟))
      const arc = Math.sin(e * Math.PI) * 弯曲
      return {
        x: 起点.x + (终点.x - 起点.x) * e + arc,
        y: 起点.y + (终点.y - 起点.y) * e - arc * 0.4,
        透明度: 起点.透明度 + (终点.透明度 - 起点.透明度) * e,
        字形: e < 0.5 ? 起点.字形 : 终点.字形,
        种子: 终点.种子,
      }
    }),
  }
}

export interface 变形器选项 {
  静态?: boolean

  颜色?: string

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
    const 响应 = await fetch(src)
    if (!响应.ok) return src
    const 原文 = await 响应.text()
    const 注入后 = 注入svg尺寸(原文)
    if (注入后 === 原文) return src
    return URL.createObjectURL(new Blob([注入后], { type: 'image/svg+xml' }))
  } catch {
    return src
  }
}

async function 实际载入图标(定义: 点阵图标定义): Promise<已载图标> {
  const 图片元素 = new Image()
  const 地址 = await 解析可光栅化地址(定义.src)
  try {
    await new Promise<void>((完成, 拒绝) => {
      图片元素.onload = () => 完成()
      图片元素.onerror = () => 拒绝(new Error('图标加载失败：' + 定义.src))
      图片元素.src = 地址
    })
    const 光栅 = document.createElement('canvas')
    const 缩放 = 光栅尺寸 / Math.max(图片元素.naturalWidth, 图片元素.naturalHeight)
    const 宽 = (光栅.width = Math.max(1, Math.round(图片元素.naturalWidth * 缩放)))
    const 高 = (光栅.height = Math.max(1, Math.round(图片元素.naturalHeight * 缩放)))
    const 上下文 = 光栅.getContext('2d', { willReadFrequently: true })
    if (!上下文) throw new Error('离屏画布不可用')
    上下文.drawImage(图片元素, 0, 0, 宽, 高)
    const 掩码 = 构建墨迹掩码(上下文.getImageData(0, 0, 宽, 高).data, 宽, 高, 定义.掩码模式)
    return { id: 定义.id, name: 定义.name, 字形: 定义.字形, ...掩码 }
  } finally {
    if (地址 !== 定义.src) URL.revokeObjectURL(地址)
  }
}

function 载入图标(定义: 点阵图标定义): Promise<已载图标> {
  const 键 = `${定义.src}::${定义.掩码模式 ?? 'alpha'}`
  let 缓存 = 掩码缓存.get(键)
  if (!缓存) {
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
  const 上下文: CanvasRenderingContext2D = 原始ctx

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
  let 格 = 9
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

  function 唤醒() {
    if (帧调度中 || 帧执行中 || 已销毁) return
    上次帧 = 0
    帧调度中 = true
    raf句柄 = requestAnimationFrame(帧循环)
  }

  function 帧循环(墨点: number) {
    帧调度中 = false
    帧执行中 = true
    const 帧间隔 = 上次帧 ? (墨点 - 上次帧) / 1000 : 0
    上次帧 = 墨点
    if (!静态 && !document.hidden) 时间 += 帧间隔
    绘制(时间)
    帧执行中 = false

    if (!已销毁 && !静态 && 可见 && !document.hidden) {
      帧调度中 = true
      raf句柄 = requestAnimationFrame(帧循环)
    } else {
      raf句柄 = 0
    }
  }

  function 切换() {
    if (已载.length < 2 || !形态.length) return

    if (变形 && 采帧(静止点, 变形, 时间).完成) {
      静止点 = 形态[当前序号]
      变形 = null
    }
    const 起点 = 采帧(静止点, 变形, 时间).点.filter((p) => p.透明度 > 0.03)
    当前序号 = (当前序号 + 1) % 已载.length
    自动切换时刻 = 时间 + 自动切换间隔秒
    选项.on序号变更?.(当前序号, 已载[当前序号].name, 已载.length)
    if (静态) {
      静止点 = 形态[当前序号]
      变形 = null
      画布.dataset.transition = 'idle'
    } else {
      变形 = { 键值对表: 配对变形(起点, 形态[当前序号], w, 格), 起始时间: 时间 }
      画布.dataset.transition = 'morphing'
    }
    脏 = true
    唤醒()
  }

  function 绘制(t: number) {
    const 帧间隔 = !静态 ? Math.max(0, t - 上次时钟) : 0
    上次时钟 = t
    if (!w || !h || !已载.length) return
    if (!静态 && 时间 >= 自动切换时刻) 切换()
    if (!变形 && !指针.激活 && 指针.强度 < 0.0001 && !脏) return
    const 缓动 = 1 - Math.exp(-帧间隔 * 指针跟随速率)
    指针.强度 += ((指针.激活 ? 1 : 0) - 指针.强度) * 缓动
    指针.x += (指针.目标x - 指针.x) * 缓动
    指针.y += (指针.目标y - 指针.y) * 缓动
    上下文.clearRect(0, 0, w, h)
    上下文.textAlign = 'center'
    上下文.textBaseline = 'middle'
    上下文.font = `600 ${格 * 0.86}px "Cascadia Mono",Consolas,monospace`
    上下文.fillStyle = 颜色
    const 半径 = Math.min(涟漪半径上限, w * 0.26)
    let 帧 = 采帧(静止点, 变形, 时间)
    if (变形 && 帧.完成) {
      静止点 = 形态[当前序号]
      变形 = null
      画布.dataset.transition = 'idle'
      帧 = { 点: 静止点, 完成: true }
    }
    for (const p of 帧.点) {
      if (p.透明度 < 0.015) continue
      const 横向增量 = p.x - 指针.x
      const 纵向增量 = p.y - 指针.y
      const d = Math.hypot(横向增量, 纵向增量)
      const 影响 = Math.exp(-((d / 半径) ** 2)) * 指针.强度
      const 涟漪 = Math.sin(d * 0.066 - 时间 * 4.2) * 3.1 * 影响
      上下文.globalAlpha = 钳制到零一(p.透明度 + 影响 * 0.12)
      上下文.fillText(p.字形, p.x + (横向增量 / (d || 1)) * 涟漪, p.y + (纵向增量 / (d || 1)) * 涟漪)
    }
    上下文.globalAlpha = 1
    脏 = false
  }

  function 重算尺寸() {
    const 盒子 = 画布.getBoundingClientRect()
    w = 盒子.width
    h = 盒子.height
    const 像素比 = Math.min(2, devicePixelRatio || 1)
    画布.width = Math.round(w * 像素比)
    画布.height = Math.round(h * 像素比)
    上下文.setTransform(像素比, 0, 0, 像素比, 0, 0)
    格 = Math.max(5.3, Math.min(w / 66, h / 62))
    形态 = 已载.map((标志) => 构建点阵(标志, w, h, 格))
    静止点 = 形态[当前序号] || []
    变形 = null
    画布.dataset.transition = 'idle'
    脏 = true
    唤醒()
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
          (条目表) => {
            可见 = 条目表[0].isIntersecting
            上次时钟 = 时间
            if (可见) {
              脏 = true
              唤醒()
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
  document.addEventListener('visibilitychange', 处理页面可见性)

  function 处理页面可见性() {
    if (!document.hidden) {
      上次时钟 = 时间
      唤醒()
    }
  }

  void Promise.allSettled(定义列表.map(载入图标)).then((结果表) => {
    if (已销毁) return
    const 失败项 = 结果表.filter((r) => r.status === 'rejected')
    已载 = 结果表.filter((r) => r.status === 'fulfilled').map((r) => r.value)

    if (!已载.length || 失败项.length) {
      选项.on加载失败?.()
    }
    if (!已载.length) return
    选项.on序号变更?.(0, 已载[0].name, 已载.length)

    自动切换时刻 = 时间 + 自动切换间隔秒
    重算尺寸()
    画布.dataset.ready = 'true'
  })

  return {
    切换,
    设颜色(v: string) {
      颜色 = v
      脏 = true
      唤醒()
    },
    设静态(v: boolean) {
      静态 = v

      if (!变形) 画布.dataset.transition = 'idle'
      脏 = true
      唤醒()
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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 创建点阵变形器, type 点阵变形器, type 点阵图标定义, type 变形器选项 } from './asciiMorph'

/**
 * 控制器测试：jsdom 无 2D 画布/Image/rAF 实现，全部以可控桩替代，
 * 用逐帧时间戳驱动 rAF 循环，验证自动切换计时、瞬切、守卫与销毁行为。
 */

let raf序列 = 0
const raf回调 = new Map<number, (t: number) => void>()
let 当前时间戳 = 0
const 已创建变形器: 点阵变形器[] = []

class 假Image {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  naturalWidth = 24
  naturalHeight = 24
  private _src = ''
  set src(v: string) {
    this._src = v
    queueMicrotask(() => {
      if (this._src.includes('bad')) this.onerror?.()
      else this.onload?.()
    })
  }
  get src() {
    return this._src
  }
}

function 造2d上下文() {
  return {
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(512 * 512 * 4).fill(255) })),
  }
}

function 造定义(后缀: string, 数量 = 2): 点阵图标定义[] {
  return Array.from({ length: 数量 }, (_, i) => ({
    id: `技术${后缀}${i}`,
    name: `技术${后缀}${i}`,
    glyph: 'T',
    src: `/logos/${后缀}-${i}.svg`,
  }))
}

function 创建(定义: 点阵图标定义[], 选项: 变形器选项 = {}) {
  const 画布 = document.createElement('canvas')
  const 变形器 = 创建点阵变形器(画布, 定义, 选项)
  if (变形器) 已创建变形器.push(变形器)
  return { 画布, 变形器 }
}

function 推进帧(毫秒总数: number, 步长 = 16) {
  for (let 已进 = 0; 已进 < 毫秒总数; 已进 += 步长) {
    const 首项 = [...raf回调.entries()][0]
    if (!首项) break
    const [id, cb] = 首项
    raf回调.delete(id)
    当前时间戳 += 步长
    cb(当前时间戳)
  }
}

async function 等待载入(变形器: 点阵变形器, 序号回调 = vi.fn()) {
  await vi.waitFor(() => {
    expect(序号回调).toHaveBeenCalledTimes(1)
  })
  return 变形器
}

beforeEach(() => {
  raf序列 = 0
  raf回调.clear()
  当前时间戳 = 0
  vi.stubGlobal('Image', 假Image)
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((cb: (t: number) => void) => {
      raf回调.set(++raf序列, cb)
      return raf序列
    })
  )
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => {
      raf回调.delete(id)
    })
  )
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      text: async () => '<svg viewBox="0 0 24 24"></svg>',
    }))
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(造2d上下文 as never)
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 520,
    height: 320,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 520,
    bottom: 320,
    toJSON: () => ({}),
  } as DOMRect)
})

afterEach(() => {
  for (const 变形器 of 已创建变形器) 变形器.销毁()
  已创建变形器.length = 0
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('点阵变形器控制器', () => {
  it('加载完成后重置自动切换时刻，首个图标完整展示一个周期', async () => {
    const 序号回调 = vi.fn()
    const { 变形器 } = 创建(造定义('t1'), { on序号变更: 序号回调 })
    await 等待载入(变形器!, 序号回调)
    expect(序号回调).toHaveBeenNthCalledWith(1, 0, '技术t10', 2)

    // 接近一个周期仍未切换（若加载后未重置计时，慢网下此处会提前切换）
    推进帧(4900)
    expect(序号回调).toHaveBeenCalledTimes(1)
    // 越过 5 秒自动切换到第 2 个
    推进帧(300)
    expect(序号回调).toHaveBeenCalledTimes(2)
    expect(序号回调).toHaveBeenNthCalledWith(2, 1, '技术t11', 2)
  })

  it('运行中切换走变形过渡并按时长完成', async () => {
    const 序号回调 = vi.fn()
    const { 画布, 变形器 } = 创建(造定义('t2'), { on序号变更: 序号回调 })
    await 等待载入(变形器!, 序号回调)
    画布.click()
    expect(序号回调).toHaveBeenCalledTimes(2)
    expect(画布.dataset.transition).toBe('morphing')
    推进帧(1400)
    expect(画布.dataset.transition).toBe('idle')
  })

  it('静态模式点击瞬切，不进入变形', async () => {
    const 序号回调 = vi.fn()
    const { 画布, 变形器 } = 创建(造定义('t3'), { 静态: true, on序号变更: 序号回调 })
    await 等待载入(变形器!, 序号回调)
    画布.click()
    expect(序号回调).toHaveBeenCalledTimes(2)
    expect(画布.dataset.transition).toBe('idle')
  })

  it('少于 2 个图标时切换为安全空操作', async () => {
    const 序号回调 = vi.fn()
    const { 画布, 变形器 } = 创建(造定义('t4', 1), { on序号变更: 序号回调 })
    await 等待载入(变形器!, 序号回调)
    画布.click()
    expect(序号回调).toHaveBeenCalledTimes(1)
  })

  it('全部图标加载失败时回调 on加载失败', async () => {
    const 失败回调 = vi.fn()
    const 序号回调 = vi.fn()
    const 定义 = 造定义('t5').map((d) => ({ ...d, src: `/logos/bad-${d.id}.svg` }))
    const { 变形器 } = 创建(定义, { on加载失败: 失败回调, on序号变更: 序号回调 })
    await vi.waitFor(() => {
      expect(失败回调).toHaveBeenCalledTimes(1)
    })
    expect(序号回调).not.toHaveBeenCalled()
    expect(变形器).not.toBeNull()
  })

  it('销毁后加载完成的回调不再触发', async () => {
    const 序号回调 = vi.fn()
    const { 变形器 } = 创建(造定义('t6'), { on序号变更: 序号回调 })
    变形器!.销毁()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(序号回调).not.toHaveBeenCalled()
  })
})

import { describe, it, expect } from 'vitest'
import {
  平滑步进,
  技术字形,
  格式化技术标签,
  注入svg尺寸,
  构建墨迹掩码,
  构建点阵,
  配对变形,
  采帧,
  type 已载图标,
  type 点,
} from './asciiMorph'

describe('平滑步进', () => {
  it('端点与中点取值正确', () => {
    expect(平滑步进(0)).toBe(0)
    expect(平滑步进(1)).toBe(1)
    expect(平滑步进(0.5)).toBe(0.5)
  })

  it('越界输入被夹紧', () => {
    expect(平滑步进(-1)).toBe(0)
    expect(平滑步进(2)).toBe(1)
  })

  it('在 0 到 1 间单调不减', () => {
    let 前值 = 0
    for (let i = 0; i <= 100; i++) {
      const v = 平滑步进(i / 100)
      expect(v).toBeGreaterThanOrEqual(前值)
      前值 = v
    }
  })
})

describe('技术字形', () => {
  it('取技术名首字母并大写', () => {
    expect(技术字形('Java')).toBe('J')
    expect(技术字形('Three.js')).toBe('T')
    expect(技术字形(' tailwind CSS')).toBe('T')
  })

  it('空名回退为 #', () => {
    expect(技术字形('')).toBe('#')
  })
})

describe('格式化技术标签', () => {
  it('按参考站格式输出 大写名 · 序号 / 总数', () => {
    expect(格式化技术标签('Java', 4, 15)).toBe('JAVA · 05 / 15')
    expect(格式化技术标签('React', 0, 9)).toBe('REACT · 01 / 09')
  })
})

describe('注入svg尺寸', () => {
  it('为只有 viewBox 的 SVG 注入 512×512', () => {
    const 原文 = '<svg fill="#000" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>'
    const 结果 = 注入svg尺寸(原文)
    expect(结果).toContain('<svg width="512" height="512"')
    expect(结果).toContain('viewBox="0 0 24 24"')
  })

  it('替换已有 width/height 为 512×512', () => {
    const 原文 = '<svg width="800px" height="800px" viewBox="0 0 32 32"></svg>'
    const 结果 = 注入svg尺寸(原文)
    expect(结果).toContain('width="512"')
    expect(结果).toContain('height="512"')
    expect(结果).not.toContain('800px')
  })

  it('无 viewBox 时不改动', () => {
    const 原文 = '<svg width="45" height="36"></svg>'
    expect(注入svg尺寸(原文)).toBe(原文)
  })

  it('非法 viewBox 时不改动（零宽/非数字/负数/维度缺失）', () => {
    for (const vb of ['0 0 0 24', '0 0 a 24', '0 0 -1 24', '0 0 24', '0 0 24 24 99']) {
      const 原文 = `<svg viewBox="${vb}"></svg>`
      expect(注入svg尺寸(原文), `viewBox=${vb} 应原样返回`).toBe(原文)
    }
  })

  it('非 SVG 文本原样返回', () => {
    expect(注入svg尺寸('<div>hi</div>')).toBe('<div>hi</div>')
  })
})

describe('构建墨迹掩码', () => {
  it('提取 alpha 掩码并计算包围盒', () => {
    const 宽 = 4
    const 高 = 4
    const rgba = new Uint8ClampedArray(宽 * 高 * 4)
    // 在 (1,1)-(2,2) 画 2×2 不透明块
    for (let y = 1; y <= 2; y++)
      for (let x = 1; x <= 2; x++) {
        const i = (y * 宽 + x) * 4
        rgba[i + 3] = 255
      }
    const 掩码 = 构建墨迹掩码(rgba, 宽, 高)
    expect(掩码.left).toBe(1)
    expect(掩码.top).toBe(1)
    expect(掩码.bw).toBe(2)
    expect(掩码.bh).toBe(2)
    expect(掩码.mask[0]).toBe(0)
    expect(掩码.mask[1 * 宽 + 1]).toBe(1)
  })

  it('全透明时抛错', () => {
    const rgba = new Uint8ClampedArray(16 * 4)
    expect(() => 构建墨迹掩码(rgba, 4, 4)).toThrow('图标掩码为空')
  })
})

function 造图标(覆盖: Partial<已载图标> = {}): 已载图标 {
  const 边长 = 10
  const mask = new Float32Array(边长 * 边长).fill(1)
  return {
    id: '测试',
    name: 'Test',
    glyph: 'T',
    mask,
    width: 边长,
    height: 边长,
    left: 0,
    top: 0,
    bw: 边长,
    bh: 边长,
    ...覆盖,
  }
}

describe('构建点阵', () => {
  it('实心图标在画布中央生成满墨点阵', () => {
    const points = 构建点阵(造图标(), 100, 100, 10)
    expect(points.length).toBeGreaterThan(0)
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(100)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(100)
      // 实心掩码核心格 9/9 采样满墨 → alpha≈0.94；网格边缘格部分采样越界，墨量按比例降低
      expect(p.alpha).toBeGreaterThanOrEqual(0.48)
      expect(p.alpha).toBeLessThanOrEqual(0.9400000001)
      expect(['T', '#', '*', '+']).toContain(p.glyph)
      expect(p.seed).toBeGreaterThanOrEqual(0)
      expect(p.seed).toBeLessThan(101)
    }
    expect(points.filter((p) => Math.abs(p.alpha - 0.94) < 1e-9).length).toBeGreaterThan(0)
  })

  it('空白图标生成零点', () => {
    const 图标 = 造图标({ mask: new Float32Array(100) })
    expect(构建点阵(图标, 100, 100, 10)).toHaveLength(0)
  })
})

describe('配对变形', () => {
  const 造点 = (x: number, y: number, seed = 1): 点 => ({ x, y, alpha: 0.9, glyph: 'A', seed })

  it('目标点配对最近源点，剩余源点另生成淡出对', () => {
    const from = [造点(10, 10), 造点(50, 50, 2)]
    const to = [造点(12, 10, 3)]
    const pairs = 配对变形(from, to, 100, 10)
    expect(pairs).toHaveLength(2)
    const 匹配 = pairs.find((p) => p.to === to[0])!
    expect(匹配.from).toBe(from[0])
  })

  it('剩余源点向上淡出', () => {
    const from = [造点(10, 10), 造点(50, 50, 2)]
    const to = [造点(12, 10, 3)]
    const pairs = 配对变形(from, to, 100, 10)
    const 淡出 = pairs.find((p) => p.from === from[1])
    expect(淡出).toBeDefined()
    expect(淡出!.to.alpha).toBe(0)
    expect(淡出!.to.y).toBeLessThan(淡出!.from.y)
    expect(淡出!.bend).toBe(0)
  })

  it('无源可认领的目标点自下方升入', () => {
    const to = [造点(30, 40, 5)]
    const pairs = 配对变形([], to, 100, 10)
    expect(pairs).toHaveLength(1)
    expect(pairs[0].from.alpha).toBe(0)
    expect(pairs[0].from.y).toBe(to[0].y + 20)
    expect(pairs[0].to).toBe(to[0])
  })

  it('距离平方小于 0.01 时短路配对，保留同位源点', () => {
    const 同位点 = 造点(20, 10)
    const 远点 = 造点(80, 10, 2)
    const to = [造点(20, 10, 3)]
    const pairs = 配对变形([同位点, 远点], to, 100, 10)
    const 匹配 = pairs.find((p) => p.to === to[0])!
    expect(匹配.from).toBe(同位点)
  })

  it('延迟随横坐标从左到右递增', () => {
    const from = [造点(20, 10), 造点(80, 10, 2)]
    const to = [造点(20, 10, 3), 造点(80, 10, 4)]
    const pairs = 配对变形(from, to, 100, 10)
    const 左 = pairs.find((p) => p.to === to[0])!
    const 右 = pairs.find((p) => p.to === to[1])!
    expect(左.delay).toBeCloseTo(0.026, 6)
    expect(右.delay).toBeCloseTo(0.104, 6)
    expect(右.delay).toBeGreaterThan(左.delay)
  })
})

describe('采帧', () => {
  const 造点 = (覆盖: Partial<点>): 点 => ({ x: 0, y: 0, alpha: 1, glyph: 'A', seed: 1, ...覆盖 })
  const from = 造点({ x: 0, y: 0, alpha: 1, glyph: 'A' })
  const to = 造点({ x: 100, y: 50, alpha: 0.5, glyph: 'B', seed: 2 })

  it('无变形时返回静止点', () => {
    const 帧 = 采帧([from], null, 10)
    expect(帧.点).toEqual([from])
    expect(帧.完成).toBe(false)
  })

  it('中途按缓动插值，字形过半程切换', () => {
    const 变形 = { pairs: [{ from, to, delay: 0, bend: 0 }], 起始时间: 0 }
    const 前半 = 采帧([to], 变形, 1.25 * 0.25)
    expect(前半.完成).toBe(false)
    expect(前半.点[0].glyph).toBe('A')
    expect(前半.点[0].x).toBeGreaterThan(0)
    expect(前半.点[0].x).toBeLessThan(50)
    const 中点 = 采帧([to], 变形, 1.25 * 0.5)
    expect(中点.点[0].x).toBeCloseTo(50, 6)
    expect(中点.点[0].y).toBeCloseTo(25, 6)
    expect(中点.点[0].alpha).toBeCloseTo(0.75, 6)
    expect(中点.点[0].glyph).toBe('B')
  })

  it('到达时长后宣告完成', () => {
    const 变形 = { pairs: [{ from, to, delay: 0, bend: 0 }], 起始时间: 0 }
    const 帧 = 采帧([to], 变形, 1.25)
    expect(帧.完成).toBe(true)
    expect(帧.点).toEqual([to])
  })
})

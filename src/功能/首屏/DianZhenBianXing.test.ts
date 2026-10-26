import { describe, it, expect } from 'vitest'
import {
  平滑步进,
  技术字形,
  注入svg尺寸,
  构建墨迹掩码,
  构建点阵,
  配对变形,
  采帧,
  type 已载图标,
  type 点,
} from './DianZhenBianXing'

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
    for (const 顶点缓冲 of ['0 0 0 24', '0 0 a 24', '0 0 -1 24', '0 0 24', '0 0 24 24 99']) {
      const 原文 = `<svg viewBox="${顶点缓冲}"></svg>`
      expect(注入svg尺寸(原文), `viewBox=${顶点缓冲} 应原样返回`).toBe(原文)
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
    const 透明颜色 = new Uint8ClampedArray(宽 * 高 * 4)

    for (let y = 1; y <= 2; y++)
      for (let x = 1; x <= 2; x++) {
        const i = (y * 宽 + x) * 4
        透明颜色[i + 3] = 255
      }
    const 掩码 = 构建墨迹掩码(透明颜色, 宽, 高)
    expect(掩码.左边界).toBe(1)
    expect(掩码.上边界).toBe(1)
    expect(掩码.bw).toBe(2)
    expect(掩码.bh).toBe(2)
    expect(掩码.遮罩[0]).toBe(0)
    expect(掩码.遮罩[1 * 宽 + 1]).toBe(1)
  })

  it('全透明时抛错', () => {
    const 透明颜色 = new Uint8ClampedArray(16 * 4)
    expect(() => 构建墨迹掩码(透明颜色, 4, 4)).toThrow('图标掩码为空')
  })

  it('light 模式只保留高亮像素（蓝底白字提取白色字样）', () => {
    const 宽 = 2
    const 高 = 1

    const 透明颜色 = new Uint8ClampedArray([255, 255, 255, 255, 49, 120, 198, 255])
    const 掩码 = 构建墨迹掩码(透明颜色, 宽, 高, 'light')
    expect(掩码.遮罩[0]).toBe(1)
    expect(掩码.遮罩[1]).toBe(0)
  })

  it('dark 模式只保留暗像素（亮底深字的反向提取）', () => {
    const 宽 = 2
    const 高 = 1
    const 透明颜色 = new Uint8ClampedArray([255, 255, 255, 255, 10, 10, 10, 255])
    const 掩码 = 构建墨迹掩码(透明颜色, 宽, 高, 'dark')
    expect(掩码.遮罩[0]).toBe(0)
    expect(掩码.遮罩[1]).toBeCloseTo((0.5 - 10 / 255) * 2, 6)
  })

  it('light 模式下掩码全空时抛错（防止无字样的底色图标静默丢失）', () => {
    const 宽 = 2
    const 高 = 1

    const 透明颜色 = new Uint8ClampedArray([49, 120, 198, 255, 49, 120, 198, 255])
    expect(() => 构建墨迹掩码(透明颜色, 宽, 高, 'light')).toThrow('图标掩码为空')
  })
})

function 造图标(覆盖: Partial<已载图标> = {}): 已载图标 {
  const 边长 = 10
  const 遮罩 = new Float32Array(边长 * 边长).fill(1)
  return {
    id: '测试',
    name: 'Test',
    字形: 'T',
    遮罩: 遮罩,
    width: 边长,
    height: 边长,
    左边界: 0,
    上边界: 0,
    bw: 边长,
    bh: 边长,
    ...覆盖,
  }
}

describe('构建点阵', () => {
  it('实心图标在画布中央生成满墨点阵', () => {
    const 点表 = 构建点阵(造图标(), 100, 100, 10)
    expect(点表.length).toBeGreaterThan(0)
    for (const p of 点表) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(100)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(100)

      expect(p.透明度).toBeGreaterThanOrEqual(0.48)
      expect(p.透明度).toBeLessThanOrEqual(0.9400000001)
      expect(['T', '#', '*', '+']).toContain(p.字形)
      expect(p.种子).toBeGreaterThanOrEqual(0)
      expect(p.种子).toBeLessThan(101)
    }
    expect(点表.filter((p) => Math.abs(p.透明度 - 0.94) < 1e-9).length).toBeGreaterThan(0)
  })

  it('空白图标生成零点', () => {
    const 图标 = 造图标({ 遮罩: new Float32Array(100) })
    expect(构建点阵(图标, 100, 100, 10)).toHaveLength(0)
  })
})

describe('配对变形', () => {
  const 造点 = (x: number, y: number, 种子 = 1): 点 => ({ x, y, 透明度: 0.9, 字形: 'A', 种子: 种子 })

  it('目标点配对最近源点，剩余源点另生成淡出对', () => {
    const 起点 = [造点(10, 10), 造点(50, 50, 2)]
    const 终点 = [造点(12, 10, 3)]
    const 键值对表 = 配对变形(起点, 终点, 100, 10)
    expect(键值对表).toHaveLength(2)
    const 匹配 = 键值对表.find((p) => p.终点 === 终点[0])!
    expect(匹配.起点).toBe(起点[0])
  })

  it('剩余源点向上淡出', () => {
    const 起点 = [造点(10, 10), 造点(50, 50, 2)]
    const 终点 = [造点(12, 10, 3)]
    const 键值对表 = 配对变形(起点, 终点, 100, 10)
    const 淡出 = 键值对表.find((p) => p.起点 === 起点[1])
    expect(淡出).toBeDefined()
    expect(淡出!.终点.透明度).toBe(0)
    expect(淡出!.终点.y).toBeLessThan(淡出!.起点.y)
    expect(淡出!.弯曲).toBe(0)
  })

  it('无源可认领的目标点自下方升入', () => {
    const 终点 = [造点(30, 40, 5)]
    const 键值对表 = 配对变形([], 终点, 100, 10)
    expect(键值对表).toHaveLength(1)
    expect(键值对表[0].起点.透明度).toBe(0)
    expect(键值对表[0].起点.y).toBe(终点[0].y + 20)
    expect(键值对表[0].终点).toBe(终点[0])
  })

  it('距离平方小于 0.01 时短路配对，保留同位源点', () => {
    const 同位点 = 造点(20, 10)
    const 远点 = 造点(80, 10, 2)
    const 终点 = [造点(20, 10, 3)]
    const 键值对表 = 配对变形([同位点, 远点], 终点, 100, 10)
    const 匹配 = 键值对表.find((p) => p.终点 === 终点[0])!
    expect(匹配.起点).toBe(同位点)
  })

  it('延迟随横坐标从左到右递增', () => {
    const 起点 = [造点(20, 10), 造点(80, 10, 2)]
    const 终点 = [造点(20, 10, 3), 造点(80, 10, 4)]
    const 键值对表 = 配对变形(起点, 终点, 100, 10)
    const 左 = 键值对表.find((p) => p.终点 === 终点[0])!
    const 右 = 键值对表.find((p) => p.终点 === 终点[1])!
    expect(左.延迟).toBeCloseTo(0.026, 6)
    expect(右.延迟).toBeCloseTo(0.104, 6)
    expect(右.延迟).toBeGreaterThan(左.延迟)
  })
})

describe('采帧', () => {
  const 造点 = (覆盖: Partial<点>): 点 => ({ x: 0, y: 0, 透明度: 1, 字形: 'A', 种子: 1, ...覆盖 })
  const 起点 = 造点({ x: 0, y: 0, 透明度: 1, 字形: 'A' })
  const 终点 = 造点({ x: 100, y: 50, 透明度: 0.5, 字形: 'B', 种子: 2 })

  it('无变形时返回静止点', () => {
    const 帧 = 采帧([起点], null, 10)
    expect(帧.点).toEqual([起点])
    expect(帧.完成).toBe(false)
  })

  it('中途按缓动插值，字形过半程切换', () => {
    const 变形 = { 键值对表: [{ 起点, 终点, 延迟: 0, 弯曲: 0 }], 起始时间: 0 }
    const 前半 = 采帧([终点], 变形, 1.25 * 0.25)
    expect(前半.完成).toBe(false)
    expect(前半.点[0].字形).toBe('A')
    expect(前半.点[0].x).toBeGreaterThan(0)
    expect(前半.点[0].x).toBeLessThan(50)
    const 中点 = 采帧([终点], 变形, 1.25 * 0.5)
    expect(中点.点[0].x).toBeCloseTo(50, 6)
    expect(中点.点[0].y).toBeCloseTo(25, 6)
    expect(中点.点[0].透明度).toBeCloseTo(0.75, 6)
    expect(中点.点[0].字形).toBe('B')
  })

  it('到达时长后宣告完成', () => {
    const 变形 = { 键值对表: [{ 起点, 终点, 延迟: 0, 弯曲: 0 }], 起始时间: 0 }
    const 帧 = 采帧([终点], 变形, 1.25)
    expect(帧.完成).toBe(true)
    expect(帧.点).toEqual([终点])
  })
})

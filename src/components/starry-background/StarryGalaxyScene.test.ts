import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { DEFAULT_EFFECT_PARAMS, 随机超新星颜色 } from './StarryGalaxyScene'

describe('StarryGalaxyScene 默认特效参数', () => {
  it('超新星默认频率为 0.5', () => {
    expect(DEFAULT_EFFECT_PARAMS.supernova.frequency).toBe(0.5)
  })

  it('星云默认数量为 6', () => {
    expect(DEFAULT_EFFECT_PARAMS.nebula.count).toBe(6)
  })

  it('星云默认透明度为 0.5', () => {
    expect(DEFAULT_EFFECT_PARAMS.nebula.opacity).toBe(0.5)
  })

  it('星星闪烁默认强度为 0.6', () => {
    expect(DEFAULT_EFFECT_PARAMS.twinkle.intensity).toBe(0.6)
  })

  it('星星闪烁默认速度为 1.85', () => {
    expect(DEFAULT_EFFECT_PARAMS.twinkle.speed).toBe(1.85)
  })

  it('尘埃粒子默认透明度为 1', () => {
    expect(DEFAULT_EFFECT_PARAMS.stardust.opacity).toBe(1)
  })
})

describe('随机超新星颜色（FP-04 根因修复）', () => {
  it('返回 THREE.Color 且饱和度固定为 0.9、亮度 0.6', () => {
    const c = 随机超新星颜色()
    expect(c).toBeInstanceOf(THREE.Color)
    const hsl = { h: 0, s: 0, l: 0 }
    c.getHSL(hsl)
    expect(hsl.s).toBeCloseTo(0.9, 5)
    expect(hsl.l).toBeCloseTo(0.6, 5)
  })

  it('连续生成呈现多种色相（每次完全随机，非固定单色）', () => {
    const 样本 = new Set<string>()
    for (let i = 0; i < 50; i++) 样本.add(随机超新星颜色().getHexString())
    expect(样本.size).toBeGreaterThan(1)
  })
})

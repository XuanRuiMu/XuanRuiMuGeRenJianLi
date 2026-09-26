import { describe, it, expect } from 'vitest'
import { 计算晾衣架布局, 计算布局基准宽, 最小带宽, 最大带宽 } from './clotheslineLayout'

describe('晾衣架布局（手机版网格已删除，任何设备同一套物理布局）', () => {
  it('窄于最小带宽（手机 390px）：按最小带宽铺开，区域最小宽抬到最小带宽 → 产生横向滚动', () => {
    const 布局 = 计算晾衣架布局(390)
    expect(布局.带宽).toBe(最小带宽)
    expect(布局.区域最小宽).toBe(最小带宽)
    expect(布局.布局偏移X).toBe(0)
  })

  it('中间宽度（900px）：带宽即基准宽，居中偏移为 0', () => {
    const 布局 = 计算晾衣架布局(900)
    expect(布局.带宽).toBe(900)
    expect(布局.区域最小宽).toBe(900)
    expect(布局.布局偏移X).toBe(0)
  })

  it('宽于最大带宽（1920px）：带宽封顶，便签集群居中', () => {
    const 布局 = 计算晾衣架布局(1920)
    expect(布局.带宽).toBe(最大带宽)
    expect(布局.区域最小宽).toBe(1920)
    expect(布局.布局偏移X).toBe((1920 - 最大带宽) / 2)
  })

  it('异常宽度（0 / NaN / 负）不产生 NaN，退化为最小带宽', () => {
    for (const 宽 of [0, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
      const 布局 = 计算晾衣架布局(宽)
      expect(Number.isFinite(布局.带宽)).toBe(true)
      expect(布局.带宽).toBeGreaterThanOrEqual(最小带宽)
      expect(布局.区域最小宽).toBeGreaterThanOrEqual(最小带宽)
      expect(Number.isFinite(布局.布局偏移X)).toBe(true)
    }
  })

  it('区域最小宽永不小于带宽，也不小于基准宽（滚动容器宽度守恒）', () => {
    for (const 宽 of [320, 390, 767, 768, 800, 1152, 1440, 2560]) {
      const 布局 = 计算晾衣架布局(宽)
      expect(布局.区域最小宽).toBeGreaterThanOrEqual(布局.带宽)
      expect(布局.区域最小宽).toBeGreaterThanOrEqual(Math.min(宽, 布局.区域最小宽))
    }
  })

  it('布局基准宽取自身与外层的较小者（min-width 撑住自身时以外层新鲜信号为准）', () => {
    expect(计算布局基准宽(1440, 700)).toBe(700)
    expect(计算布局基准宽(700, 1440)).toBe(700)
    expect(计算布局基准宽(1086, 1086)).toBe(1086)
    expect(计算布局基准宽(0, 700)).toBe(700)
    expect(计算布局基准宽(900, 0)).toBe(900)
    expect(计算布局基准宽(0, 0)).toBe(0)
    expect(计算布局基准宽(Number.NaN, 700)).toBe(700)
    expect(计算布局基准宽(900, Number.NaN)).toBe(900)
    expect(计算布局基准宽(Number.NaN, Number.NaN)).toBe(0)
  })

  it('收缩重建后布局跟随外层可用宽（1440→700 不再钉死旧宽）', () => {
    const 收缩后基准 = 计算布局基准宽(1440, 700)
    expect(计算晾衣架布局(收缩后基准).区域最小宽).toBe(最小带宽)
    expect(计算晾衣架布局(收缩后基准).带宽).toBe(最小带宽)
  })
})

import { describe, it, expect } from 'vitest'
import { 逼近目标转速, 惯性减速时长 } from './techSpin'

describe('技术球惯性减速', () => {
  it('减速时长恒为500毫秒', () => {
    expect(惯性减速时长).toBe(500)
  })

  it('悬停后500毫秒内线性减速至停止', () => {
    expect(逼近目标转速(1, 0, 500)).toBe(0)
    expect(逼近目标转速(1, 0, 250)).toBeCloseTo(0.5, 6)
    expect(逼近目标转速(0.5, 0, 250)).toBe(0)
  })

  it('移开后500毫秒内线性恢复原速', () => {
    expect(逼近目标转速(0, 1, 500)).toBe(1)
    expect(逼近目标转速(0, 1, 250)).toBeCloseTo(0.5, 6)
  })

  it('超大步长直接到达目标不越界', () => {
    expect(逼近目标转速(0.8, 0, 1000)).toBe(0)
    expect(逼近目标转速(0.2, 1, 1000)).toBe(1)
  })

  it('当前等于目标时保持不变', () => {
    expect(逼近目标转速(0, 0, 16)).toBe(0)
    expect(逼近目标转速(1, 1, 16)).toBe(1)
  })
})

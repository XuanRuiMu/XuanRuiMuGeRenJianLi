import { describe, it, expect, beforeEach } from 'vitest'
import { useBianQianFengLi, 风力存储键, 默认风力强度 } from './便签风力仓库'

describe('useProjectsWindStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useBianQianFengLi.setState({ 风力强度: 默认风力强度 })
  })

  it('默认风力强度为 1', () => {
    expect(默认风力强度).toBe(1)
    expect(useBianQianFengLi.getState().风力强度).toBe(1)
  })

  it('设置风力强度会更新状态', () => {
    useBianQianFengLi.getState().设置风力强度(1.5)
    expect(useBianQianFengLi.getState().风力强度).toBe(1.5)
  })

  it('设置会被持久化到 localStorage', () => {
    useBianQianFengLi.getState().设置风力强度(0.6)
    const 原始 = localStorage.getItem(风力存储键)
    expect(原始).not.toBeNull()
    const 解析 = JSON.parse(原始!) as { state: { 风力强度: number } }
    expect(解析.state.风力强度).toBe(0.6)
  })

  it('重新水合时从 localStorage 恢复风力强度', async () => {
    localStorage.setItem(风力存储键, JSON.stringify({ state: { 风力强度: 1.8 }, version: 0 }))
    await useBianQianFengLi.persist.rehydrate()
    expect(useBianQianFengLi.getState().风力强度).toBe(1.8)
  })

  it('水合净化：持久化风力强度越界/非法时钳制回落，不得绕过范围约束', async () => {
    const 毒值表: unknown[] = [9999, -3, Number.NaN, 'abc', null, {}, Infinity]
    for (const 毒值 of 毒值表) {
      localStorage.setItem(风力存储键, JSON.stringify({ state: { 风力强度: 毒值 }, version: 0 }))
      await useBianQianFengLi.persist.rehydrate()
      const 强度 = useBianQianFengLi.getState().风力强度
      expect(Number.isFinite(强度), `毒值 ${String(毒值)} 水合后必须是有限数`).toBe(true)
      expect(强度).toBeGreaterThanOrEqual(0)
      expect(强度).toBeLessThanOrEqual(2)
    }
  })

  it('风力强度被约束在允许范围内', () => {
    useBianQianFengLi.getState().设置风力强度(99)
    expect(useBianQianFengLi.getState().风力强度).toBeLessThanOrEqual(2)
    useBianQianFengLi.getState().设置风力强度(-5)
    expect(useBianQianFengLi.getState().风力强度).toBeGreaterThanOrEqual(0)
  })
})

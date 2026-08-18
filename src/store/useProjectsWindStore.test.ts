import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectsWindStore, 风力存储键, 默认风力强度 } from './useProjectsWindStore'

describe('useProjectsWindStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useProjectsWindStore.setState({ 风力强度: 默认风力强度 })
  })

  it('默认风力强度为 1', () => {
    expect(默认风力强度).toBe(1)
    expect(useProjectsWindStore.getState().风力强度).toBe(1)
  })

  it('设置风力强度会更新状态', () => {
    useProjectsWindStore.getState().设置风力强度(1.5)
    expect(useProjectsWindStore.getState().风力强度).toBe(1.5)
  })

  it('设置会被持久化到 localStorage', () => {
    useProjectsWindStore.getState().设置风力强度(0.6)
    const 原始 = localStorage.getItem(风力存储键)
    expect(原始).not.toBeNull()
    const 解析 = JSON.parse(原始!) as { state: { 风力强度: number } }
    expect(解析.state.风力强度).toBe(0.6)
  })

  it('重新水合时从 localStorage 恢复风力强度', async () => {
    localStorage.setItem(风力存储键, JSON.stringify({ state: { 风力强度: 1.8 }, version: 0 }))
    await useProjectsWindStore.persist.rehydrate()
    expect(useProjectsWindStore.getState().风力强度).toBe(1.8)
  })

  it('风力强度被约束在允许范围内', () => {
    useProjectsWindStore.getState().设置风力强度(99)
    expect(useProjectsWindStore.getState().风力强度).toBeLessThanOrEqual(2)
    useProjectsWindStore.getState().设置风力强度(-5)
    expect(useProjectsWindStore.getState().风力强度).toBeGreaterThanOrEqual(0)
  })
})

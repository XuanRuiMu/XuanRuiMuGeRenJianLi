import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const 风力存储键 = 'projects-wind-settings'
export const 默认风力强度 = 1
export const 风力下限 = 0
export const 风力上限 = 2

interface 便签风力状态 {
  风力强度: number
  设置风力强度: (值: number) => void
}

/** 钳制到合法区间：非有限数回落默认值（与 设置风力强度 同一套规则，水合与运行时一致） */
function 钳制风力(值: unknown): number {
  if (typeof 值 !== 'number' || !Number.isFinite(值)) return 默认风力强度
  return Math.min(Math.max(值, 风力下限), 风力上限)
}

/** 水合净化：持久化内容属外部输入，风力强度必须校验类型与范围后才进状态 */
function 净化风力态(持久态: unknown, 当前态: 便签风力状态): 便签风力状态 {
  const 候选 = (持久态 ?? {}) as Partial<便签风力状态>
  return {
    ...当前态,
    风力强度: 候选.风力强度 === undefined ? 当前态.风力强度 : 钳制风力(候选.风力强度),
  }
}

export const useBianQianFengLi = create<便签风力状态>()(
  persist(
    (set) => ({
      风力强度: 默认风力强度,
      设置风力强度: (值) => set({ 风力强度: 钳制风力(值) }),
    }),
    { name: 风力存储键, merge: 净化风力态 }
  )
)

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface 星空开关状态 {
  墨迹启用: boolean
  设置墨迹启用: (v: boolean) => void
  星空隐藏: boolean
  设置星空隐藏: (v: boolean) => void
}

function 净化星空开关态(持久态: unknown, 当前态: 星空开关状态): 星空开关状态 {
  const 候选 = (持久态 ?? {}) as Partial<星空开关状态>
  return {
    ...当前态,
    星空隐藏: typeof 候选.星空隐藏 === 'boolean' ? 候选.星空隐藏 : 当前态.星空隐藏,
  }
}

const 安全存储 = createJSONStorage(() => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
  }
  return window.localStorage
})

export const useXingKongKaiGuan = create<星空开关状态>()(
  persist(
    (设置) => ({
      墨迹启用: true,
      设置墨迹启用: (v) => 设置({ 墨迹启用: v }),
      星空隐藏: false,
      设置星空隐藏: (v) => 设置({ 星空隐藏: v }),
    }),
    {
      name: 'xuanruimu:starry-ui',
      storage: 安全存储,

      partialize: (状态) => ({ starryHidden: 状态.星空隐藏 }),
      merge: 净化星空开关态,
    }
  )
)

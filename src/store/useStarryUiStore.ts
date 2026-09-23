import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface StarryUiState {
  inkEnabled: boolean
  setInkEnabled: (v: boolean) => void
  starryHidden: boolean
  setStarryHidden: (v: boolean) => void
}

// 服务端 / 无 storage 环境（如某些测试 runner）下返回空实现，persist 自动跳过，
// 不阻塞渲染，也不抛错。浏览器与 vitest(jsdom) 均具备 localStorage。
const safeStorage = createJSONStorage(() => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
  }
  return window.localStorage
})

export const useStarryUiStore = create<StarryUiState>()(
  persist(
    (set) => ({
      inkEnabled: true,
      setInkEnabled: (v) => set({ inkEnabled: v }),
      starryHidden: false,
      setStarryHidden: (v) => set({ starryHidden: v }),
    }),
    {
      name: 'xuanruimu:starry-ui',
      storage: safeStorage,
      // 仅持久化 starryHidden，不扩大 inkEnabled 的持久化范围
      partialize: (state) => ({ starryHidden: state.starryHidden }),
    }
  )
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const 风力存储键 = 'projects-wind-settings'
export const 默认风力强度 = 1
export const 风力下限 = 0
export const 风力上限 = 2

interface ProjectsWindState {
  风力强度: number
  设置风力强度: (值: number) => void
}

export const useProjectsWindStore = create<ProjectsWindState>()(
  persist(
    (set) => ({
      风力强度: 默认风力强度,
      设置风力强度: (值) =>
        set({ 风力强度: Math.min(Math.max(Number.isFinite(值) ? 值 : 默认风力强度, 风力下限), 风力上限) }),
    }),
    { name: 风力存储键 }
  )
)

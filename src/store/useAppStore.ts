import { create } from 'zustand'
import type { PerformanceMetrics, FrameMetrics, QualityLevel } from '../domain/types'
import type { UiComponent } from '../ai/structuredOutput'
import { 读取已选模型ID, 持久化已选模型ID, 默认模型ID, 默认思考强度, type 思考强度 } from '../ai/models'
import { lenisRef } from '../lib/lenisInstance'

export type AppTheme = 'dark' | 'light' | 'system'

export type AppSection =
  'hero' | 'about' | 'projects' | 'skills' | 'experience' | 'education' | 'design' | 'media' | 'contact'

export type 回退原因 = 'timeout' | 'http' | 'network' | 'format'

export interface AiToolMeta {
  命中数: number
  耗时毫秒: number
  本地兜底: boolean
  回退原因?: 回退原因
  http状态?: number
}

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
  /** vision 输入：用户随消息携带的图片（data URL）；仅在 user 消息中有效（API 限制） */
  images?: string[]
  component?: UiComponent
  /** 流式思考原文（reasoning_content 增量拼出的完整思考流；历史消息无该字段时回退兼容为不渲染） */
  reasoning?: string
  /** 检索轨迹：命中数/耗时/是否本地兜底 */
  meta?: AiToolMeta
}

export interface AppState {
  activeSection: AppSection | null
  theme: AppTheme
  commandOpen: boolean
  chatOpen: boolean
  aiMessages: AiMessage[]
  aiModel: string
  aiThinking: 思考强度
  /** /clear 前暂存的上一会话（供 /resume 恢复；只保留最近一次） */
  stashedSession: AiMessage[]
  reducedMotion: boolean
  isOffline: boolean
  updateAvailable: boolean
  offlineReady: boolean
  cacheQuotaWarning: boolean
  qualityLevel: QualityLevel
  performanceMetrics: PerformanceMetrics
  frameMetrics: FrameMetrics

  setActiveSection: (section: AppSection | null) => void
  setTheme: (theme: AppTheme) => void
  toggleCommand: () => void
  setCommandOpen: (open: boolean) => void
  toggleChat: () => void
  setChatOpen: (open: boolean) => void
  addAiMessage: (message: AiMessage) => void
  updateAiMessage: (index: number, patch: Partial<AiMessage>) => void
  clearAiMessages: () => void
  setAiModel: (model: string) => void
  stashSession: (messages: AiMessage[]) => void
  restoreSession: (messages: AiMessage[]) => void
  setAiThinking: (强度: 思考强度) => void
  setReducedMotion: (enabled: boolean) => void
  setOffline: (offline: boolean) => void
  setUpdateAvailable: (available: boolean) => void
  setOfflineReady: (ready: boolean) => void
  setCacheQuotaWarning: (warning: boolean) => void
  setQualityLevel: (level: QualityLevel) => void
  setPerformanceMetrics: (metrics: PerformanceMetrics) => void
  setFrameMetrics: (metrics: Partial<FrameMetrics>) => void
  transitionToSection: (section: AppSection) => void
  transitionToTheater: () => void
}

export const SECTION_ORDER: AppSection[] = [
  'hero',
  'about',
  'projects',
  'skills',
  'experience',
  'education',
  'design',
  'media',
  'contact',
]

export const SECTIONS: Record<string, AppSection> = {
  HERO: 'hero',
  ABOUT: 'about',
  PROJECTS: 'projects',
  SKILLS: 'skills',
  EXPERIENCE: 'experience',
  EDUCATION: 'education',
  DESIGN: 'design',
  MEDIA: 'media',
  CONTACT: 'contact',
}

export const useAppStore = create<AppState>((set, get) => ({
  activeSection: null,
  theme: 'dark',
  commandOpen: false,
  chatOpen: false,
  aiMessages: [],
  aiModel: 读取已选模型ID() || 默认模型ID,
  aiThinking: 默认思考强度,
  stashedSession: [],
  reducedMotion: false,
  isOffline: false,
  updateAvailable: false,
  offlineReady: false,
  cacheQuotaWarning: false,
  qualityLevel: 'high',
  performanceMetrics: {},
  frameMetrics: { fps: 0, p95: 0, avg: 0, downgradeCount: 0, upgradeCount: 0 },

  setActiveSection: (section) => set({ activeSection: section }),
  setTheme: (theme) => set({ theme }),
  toggleCommand: () => set((state) => ({ commandOpen: !state.commandOpen })),
  setCommandOpen: (open) => set({ commandOpen: open }),
  toggleChat: () => set((state) => ({ chatOpen: !state.chatOpen })),
  setChatOpen: (open) => set({ chatOpen: open }),
  addAiMessage: (message) => set((state) => ({ aiMessages: [...state.aiMessages, message] })),
  updateAiMessage: (index, patch) =>
    set((state) => ({
      aiMessages: state.aiMessages.map((message, i) => (i === index ? { ...message, ...patch } : message)),
    })),
  clearAiMessages: () => set({ aiMessages: [] }),
  setAiModel: (model) => {
    持久化已选模型ID(model)
    set({ aiModel: model })
  },
  stashSession: (messages) => set({ stashedSession: messages }),
  restoreSession: (messages) => set({ aiMessages: messages }),
  setAiThinking: (强度) => set({ aiThinking: 强度 }),
  setReducedMotion: (enabled) => set({ reducedMotion: enabled }),
  setOffline: (offline) => set({ isOffline: offline }),
  setUpdateAvailable: (available) => set({ updateAvailable: available }),
  setOfflineReady: (ready) => set({ offlineReady: ready }),
  setCacheQuotaWarning: (warning) => set({ cacheQuotaWarning: warning }),
  setQualityLevel: (level) => set({ qualityLevel: level }),
  setPerformanceMetrics: (metrics) => set({ performanceMetrics: metrics }),
  setFrameMetrics: (metrics) => set((state) => ({ frameMetrics: { ...state.frameMetrics, ...metrics } })),
  transitionToSection: (section) => {
    set({ activeSection: section })
    // 固定顶栏高度（glass-nav 胶囊 h-12 + py-2 = 64px，收缩态还有 y:20 位移），跳转时留出偏移
    const 顶栏偏移 = -80
    const scrollTo = (element: HTMLElement) => {
      const lenis = lenisRef.current
      if (lenis && !get().reducedMotion) {
        lenis.scrollTo(element, { offset: 顶栏偏移 })
      } else {
        element.scrollIntoView({ behavior: get().reducedMotion ? 'auto' : 'smooth' })
      }
    }
    const element = document.getElementById(section)
    if (element) {
      scrollTo(element)
      return
    }
    // 处理懒加载区块：等待元素挂载后再滚动
    const observer = new MutationObserver(() => {
      const target = document.getElementById(section)
      if (target) {
        observer.disconnect()
        scrollTo(target)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    window.setTimeout(() => observer.disconnect(), 3000)
  },
  transitionToTheater: () => set({ activeSection: null }),
}))

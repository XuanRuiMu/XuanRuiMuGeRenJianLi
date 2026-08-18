import { create } from 'zustand'
import type { PerformanceMetrics, FrameMetrics, QualityLevel } from '../domain/types'
import type { UiComponent } from '../ai/structuredOutput'
import { lenisRef } from '../lib/lenisInstance'

export type AppTheme = 'dark' | 'light' | 'system'

export type AppSection =
  'hero' | 'about' | 'projects' | 'experience' | 'education' | 'design' | 'media' | 'contact'

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
  component?: UiComponent
}

export interface AppState {
  activeSection: AppSection | null
  theme: AppTheme
  commandOpen: boolean
  chatOpen: boolean
  aiMessages: AiMessage[]
  aiModel: 'flash' | 'pro'
  aiThinking: boolean
  aiThinkingStrength: 'low' | 'high' | 'max'
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
  clearAiMessages: () => void
  setAiModel: (model: 'flash' | 'pro') => void
  setAiThinking: (enabled: boolean) => void
  setAiThinkingStrength: (strength: 'low' | 'high' | 'max') => void
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
  aiModel: 'flash',
  aiThinking: true,
  aiThinkingStrength: 'high',
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
  clearAiMessages: () => set({ aiMessages: [] }),
  setAiModel: (model) => set({ aiModel: model }),
  setAiThinking: (enabled) => set({ aiThinking: enabled }),
  setAiThinkingStrength: (strength) => set({ aiThinkingStrength: strength }),
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

import { create } from 'zustand'
import type { 性能指标, 帧指标, 画质档位值 } from '../领域/类型'
import type { 界面组件 } from '../智能/结构化输出'
import { 读取已选模型ID, 持久化已选模型ID, 默认模型ID, 默认思考强度, type 思考强度 } from '../智能/模型'
import { 平滑滚动引用 } from '../库/平滑滚动实例'

export type 应用主题 = 'dark' | 'light' | 'system'

export type 应用板块 =
  'hero' | 'about' | 'projects' | 'skills' | 'experience' | 'education' | 'design' | 'media' | 'contact'

export type 回退原因 = 'timeout' | 'http' | 'network' | 'format' | 'truncated'

export interface AI工具元数据 {
  命中数: number
  耗时毫秒: number
  本地兜底: boolean
  /** 正文被 max_tokens 截断（finish_reason=length）：如实告知访客，不让半截回答冒充完整回答 */
  截断?: boolean
  /** 本轮检索命中的语料分类（已转中文来源名），用于回答末尾标注依据 */
  依据来源?: string[]
  回退原因?: 回退原因
  http状态?: number
}

export interface AI消息 {
  role: 'user' | 'assistant'
  content: string
  /** vision 输入：用户随消息携带的图片（data URL）；仅在 user 消息中有效（API 限制） */
  images?: string[]
  component?: 界面组件
  /** 流式思考原文（reasoning_content 增量拼出的完整思考流；历史消息无该字段时回退兼容为不渲染） */
  reasoning?: string
  /** 检索轨迹：命中数/耗时/是否本地兜底 */
  meta?: AI工具元数据
}

export interface 应用状态 {
  activeSection: 应用板块 | null
  theme: 应用主题
  commandOpen: boolean
  chatOpen: boolean
  aiMessages: AI消息[]
  aiModel: string
  aiThinking: 思考强度
  /** /clear 前暂存的上一会话（供 /resume 恢复；只保留最近一次） */
  stashedSession: AI消息[]
  reducedMotion: boolean
  isOffline: boolean
  updateAvailable: boolean
  offlineReady: boolean
  cacheQuotaWarning: boolean
  qualityLevel: 画质档位值
  performanceMetrics: 性能指标
  frameMetrics: 帧指标

  setActiveSection: (section: 应用板块 | null) => void
  setTheme: (theme: 应用主题) => void
  toggleCommand: () => void
  setCommandOpen: (open: boolean) => void
  toggleChat: () => void
  setChatOpen: (open: boolean) => void
  addAiMessage: (message: AI消息) => void
  updateAiMessage: (index: number, patch: Partial<AI消息>) => void
  clearAiMessages: () => void
  setAiModel: (model: string) => void
  stashSession: (messages: AI消息[]) => void
  restoreSession: (messages: AI消息[]) => void
  setAiThinking: (强度: 思考强度) => void
  setReducedMotion: (enabled: boolean) => void
  setOffline: (offline: boolean) => void
  setUpdateAvailable: (available: boolean) => void
  setOfflineReady: (ready: boolean) => void
  setCacheQuotaWarning: (warning: boolean) => void
  setQualityLevel: (level: 画质档位值) => void
  setPerformanceMetrics: (metrics: 性能指标) => void
  setFrameMetrics: (metrics: Partial<帧指标>) => void
  transitionToSection: (section: 应用板块) => void
  transitionToTheater: () => void
}

export const 板块顺序: 应用板块[] = [
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

export const 板块表: Record<string, 应用板块> = {
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

export const useYingYongZhuangTai = create<应用状态>((set, get) => ({
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
      const lenis = 平滑滚动引用.current
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

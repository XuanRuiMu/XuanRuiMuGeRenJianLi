import { create } from 'zustand'
import type { 性能指标, 帧指标, 画质档位值 } from '../领域/类型'
import type { 界面组件 } from '../智能/结构化输出'
import { 读取已选模型ID, 持久化已选模型ID, 默认模型ID, 默认思考强度, type 思考强度 } from '../智能/模型'
import { 平滑滚动引用 } from '../库/平滑滚动实例'

export type 应用主题 = 'dark' | 'light' | 'system'

export const 主题存储键 = 'xrm-theme'

export function 读取已存主题(): 应用主题 {
  if (typeof window === 'undefined') return 'dark'
  try {
    const 已存 = window.localStorage.getItem(主题存储键)
    if (已存 === 'dark' || 已存 === 'light' || 已存 === 'system') return 已存
  } catch {}
  return 'dark'
}

export function 解析主题明暗(主题: 应用主题): 'dark' | 'light' {
  if (主题 === 'system') {
    if (typeof window === 'undefined') return 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 主题
}

export function 读取初始明暗(): 'dark' | 'light' {
  if (typeof document !== 'undefined') {
    const 根元素 = document.documentElement
    if (根元素.classList.contains('light')) return 'light'
    if (根元素.classList.contains('dark')) return 'dark'
  }
  return 解析主题明暗(读取已存主题())
}

export type 应用板块 =
  'hero' | 'about' | 'projects' | 'skills' | 'experience' | 'education' | 'design' | 'media' | 'contact'

export type 回退原因 = 'timeout' | 'http' | 'network' | 'format' | 'truncated'

export interface AI工具元数据 {
  命中数: number
  耗时毫秒: number
  本地兜底: boolean

  截断?: boolean

  依据来源?: string[]
  回退原因?: 回退原因
  http状态?: number
}

export interface AI消息 {
  role: 'user' | 'assistant'
  content: string

  图片表?: string[]
  组件?: 界面组件

  思考内容?: string

  meta?: AI工具元数据
}

export interface 应用状态 {
  活跃区块: 应用板块 | null
  主题: 应用主题
  命令面板打开: boolean
  聊天打开: boolean
  AI消息表: AI消息[]
  AI模型: string
  AI思考强度: 思考强度

  暂存的会话: AI消息[]
  减少动画: boolean
  是离线: boolean
  有可用更新: boolean
  离线就绪: boolean
  缓存配额警告: boolean
  画质档位: 画质档位值
  性能指标: 性能指标
  帧指标: 帧指标

  设置活跃区块: (区块: 应用板块 | null) => void
  设置主题: (主题: 应用主题) => void
  切换命令面板: () => void
  设置命令面板打开: (open: boolean) => void
  切换聊天: () => void
  设置聊天打开: (open: boolean) => void
  添加AI消息: (消息: AI消息) => void
  更新AI消息: (下标: number, 补丁: Partial<AI消息>) => void
  清空AI消息: () => void
  设置AI模型: (模型: string) => void
  暂存会话: (消息表: AI消息[]) => void
  恢复会话: (消息表: AI消息[]) => void
  设置AI思考: (强度: 思考强度) => void
  设置减少动画: (启用: boolean) => void
  设置离线: (离线: boolean) => void
  设置有更新: (可用: boolean) => void
  设置离线就绪: (就绪: boolean) => void
  设置缓存配额警告: (警告: boolean) => void
  设置画质档位: (级别: 画质档位值) => void
  设置性能指标: (指标: 性能指标) => void
  设置帧指标: (指标: Partial<帧指标>) => void
  切换到区块: (区块: 应用板块) => void
  切换到剧场: () => void
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

export const useYingYongZhuangTai = create<应用状态>((设置, get) => ({
  活跃区块: null,
  主题: 读取已存主题(),
  命令面板打开: false,
  聊天打开: false,
  AI消息表: [],
  AI模型: 读取已选模型ID() || 默认模型ID,
  AI思考强度: 默认思考强度,
  暂存的会话: [],
  减少动画: false,
  是离线: false,
  有可用更新: false,
  离线就绪: false,
  缓存配额警告: false,
  画质档位: 'high',
  性能指标: {},
  帧指标: { fps: 0, p95: 0, avg: 0, 降档次数: 0, 升档次数: 0 },

  设置活跃区块: (区块) => 设置({ 活跃区块: 区块 }),
  设置主题: (主题) => 设置({ 主题: 主题 }),
  切换命令面板: () => 设置((状态) => ({ 命令面板打开: !状态.命令面板打开 })),
  设置命令面板打开: (open) => 设置({ 命令面板打开: open }),
  切换聊天: () => 设置((状态) => ({ 聊天打开: !状态.聊天打开 })),
  设置聊天打开: (open) => 设置({ 聊天打开: open }),
  添加AI消息: (消息) => 设置((状态) => ({ AI消息表: [...状态.AI消息表, 消息] })),
  更新AI消息: (下标, 补丁) =>
    设置((状态) => ({
      AI消息表: 状态.AI消息表.map((消息, i) => (i === 下标 ? { ...消息, ...补丁 } : 消息)),
    })),
  清空AI消息: () => 设置({ AI消息表: [] }),
  设置AI模型: (模型) => {
    持久化已选模型ID(模型)
    设置({ AI模型: 模型 })
  },
  暂存会话: (消息表) => 设置({ 暂存的会话: 消息表 }),
  恢复会话: (消息表) => 设置({ AI消息表: 消息表 }),
  设置AI思考: (强度) => 设置({ AI思考强度: 强度 }),
  设置减少动画: (启用) => 设置({ 减少动画: 启用 }),
  设置离线: (离线) => 设置({ 是离线: 离线 }),
  设置有更新: (可用) => 设置({ 有可用更新: 可用 }),
  设置离线就绪: (就绪) => 设置({ 离线就绪: 就绪 }),
  设置缓存配额警告: (警告) => 设置({ 缓存配额警告: 警告 }),
  设置画质档位: (级别) => 设置({ 画质档位: 级别 }),
  设置性能指标: (指标) => 设置({ 性能指标: 指标 }),
  设置帧指标: (指标) => 设置((状态) => ({ 帧指标: { ...状态.帧指标, ...指标 } })),
  切换到区块: (区块) => {
    设置({ 活跃区块: 区块 })

    const 顶栏偏移 = -80
    const scrollTo = (元素: HTMLElement) => {
      const 平滑滚动 = 平滑滚动引用.current
      if (平滑滚动 && !get().减少动画) {
        平滑滚动.scrollTo(元素, { offset: 顶栏偏移 })
      } else {
        元素.scrollIntoView({ behavior: get().减少动画 ? 'auto' : 'smooth' })
      }
    }
    const 元素 = document.getElementById(区块)
    if (元素) {
      scrollTo(元素)
      return
    }

    const 观察器 = new MutationObserver(() => {
      const target = document.getElementById(区块)
      if (target) {
        观察器.disconnect()
        scrollTo(target)
      }
    })
    观察器.observe(document.body, { childList: true, subtree: true })
    window.setTimeout(() => 观察器.disconnect(), 3000)
  },
  切换到剧场: () => 设置({ 活跃区块: null }),
}))

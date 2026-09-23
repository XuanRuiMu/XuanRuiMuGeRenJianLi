import { DEEPSEEK_ENDPOINT, DEEPSEEK_MODEL } from './deepseekConfig'

export type 模型供应商 = 'openai'

/**
 * 思考强度四档：
 * DeepSeek V4 官方 thinking_mode：reasoning_effort 直传 low/high/max（medium/xhigh 兼容映射为 high），
 * 关闭即 thinking.type=disabled 且不带 reasoning_effort。
 */
export type 思考强度 = 'off' | 'low' | 'high' | 'max'

export const 思考强度顺序: 思考强度[] = ['off', 'low', 'high', 'max']

export const 默认思考强度: 思考强度 = 'high'

/** 步进思考强度：+1 增强，-1 减弱，两端钳制不循环（对齐 Claude Code ←/→ 调强度语义） */
export function 步进思考强度(当前: 思考强度, 方向: 1 | -1): 思考强度 {
  const 下标 = 思考强度顺序.indexOf(当前)
  const 基准 = 下标 === -1 ? 思考强度顺序.indexOf(默认思考强度) : 下标
  const 下一个 = Math.min(思考强度顺序.length - 1, Math.max(0, 基准 + 方向))
  return 思考强度顺序[下一个] ?? 默认思考强度
}

/** 循环思考强度：off→low→high→max→off（供 Alt+T 与 /think 轮换） */
export function 循环思考强度(当前: 思考强度): 思考强度 {
  const 下标 = 思考强度顺序.indexOf(当前)
  const 基准 = 下标 === -1 ? 0 : 下标
  return 思考强度顺序[(基准 + 1) % 思考强度顺序.length] ?? 默认思考强度
}

export interface 模型定义 {
  id: string
  provider: 模型供应商
  contextLabel?: string
  endpoint: string
}

export const 默认模型ID = DEEPSEEK_MODEL

function 读取正整数环境变量(原始值: string | undefined, 默认值: number): number {
  const 解析值 = Number(原始值)
  if (原始值 === undefined || 原始值 === '') return 默认值
  if (!Number.isFinite(解析值) || 解析值 <= 0) return 默认值
  return Math.floor(解析值)
}

export const 聊天超时毫秒 = 读取正整数环境变量(import.meta.env.VITE_CHAT_TIMEOUT_MS, 30000)

const AI模型存储键 = 'xuan-ai-model'

export function 读取已选模型ID(): string {
  try {
    return localStorage.getItem(AI模型存储键) ?? 默认模型ID
  } catch {
    return 默认模型ID
  }
}

export function 持久化已选模型ID(id: string): void {
  try {
    localStorage.setItem(AI模型存储键, id)
  } catch {
    // 无痕/沙箱下持久化不可用时静默降级为内存态
  }
}

export function 模型列表(): 模型定义[] {
  return [
    {
      id: 默认模型ID,
      provider: 'openai',
      contextLabel: 'CTX 1M',
      endpoint: DEEPSEEK_ENDPOINT,
    },
  ]
}

export function 解析模型(id?: string): 模型定义 {
  const 列表 = 模型列表()
  return 列表.find((模型) => 模型.id === id) ?? 列表[0]
}

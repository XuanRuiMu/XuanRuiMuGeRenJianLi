import { 深度求索端点, 深度求索模型 } from './深度求索配置'

export type 模型供应商 = 'openai'

export type 思考强度 = 'off' | 'low' | 'high' | 'max'

export const 思考强度顺序: 思考强度[] = ['off', 'low', 'high', 'max']

export const 默认思考强度: 思考强度 = 'high'

export function 步进思考强度(当前: 思考强度, 方向: 1 | -1): 思考强度 {
  const 下标 = 思考强度顺序.indexOf(当前)
  const 基准 = 下标 === -1 ? 思考强度顺序.indexOf(默认思考强度) : 下标
  const 下一个 = Math.min(思考强度顺序.length - 1, Math.max(0, 基准 + 方向))
  return 思考强度顺序[下一个] ?? 默认思考强度
}

export function 循环思考强度(当前: 思考强度): 思考强度 {
  const 下标 = 思考强度顺序.indexOf(当前)
  const 基准 = 下标 === -1 ? 0 : 下标
  return 思考强度顺序[(基准 + 1) % 思考强度顺序.length] ?? 默认思考强度
}

export interface 模型定义 {
  id: string
  供应商: 模型供应商
  上下文标签?: string
  端点: string
}

export const 默认模型ID = 深度求索模型

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
    const 已存 = localStorage.getItem(AI模型存储键)
    if (已存 === null) return 默认模型ID
    return 模型列表().some((模型) => 模型.id === 已存) ? 已存 : 默认模型ID
  } catch {
    return 默认模型ID
  }
}

export function 持久化已选模型ID(id: string): void {
  try {
    if (!模型列表().some((模型) => 模型.id === id)) return
    localStorage.setItem(AI模型存储键, id)
  } catch {}
}

export function 模型列表(): 模型定义[] {
  return [
    {
      id: 默认模型ID,
      供应商: 'openai',
      上下文标签: 'CTX 1M',
      端点: 深度求索端点,
    },
  ]
}

export function 解析模型(id?: string): 模型定义 {
  const 列表 = 模型列表()
  return 列表.find((模型) => 模型.id === id) ?? 列表[0]
}

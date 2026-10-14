import { 环形缓冲 } from './环形缓冲'
import { 追踪器 } from './追踪器'
import { 日志存储 } from './持久化'

export const 环形缓冲实例 = new 环形缓冲()
export const 追踪器实例 = new 追踪器(环形缓冲实例)
export const 日志存储实例 = new 日志存储()

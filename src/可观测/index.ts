export type { 日志级别, 日志条目, 日志分类 } from './环形缓冲'
export type { 跨度 } from './追踪器'
export { 环形缓冲 } from './环形缓冲'
export { 追踪器, withSpan } from './追踪器'
export { 日志存储 } from './持久化'
export { WebSocket传输 } from './WebSocket传输'
export { 信标传输 } from './信标传输'
export { 初始化控制台仪表盘 } from './控制台仪表盘'
export { 安装全局错误处理器 } from './全局错误处理器'
import { 环形缓冲实例, 追踪器实例, 日志存储实例 } from './全局'
import { WebSocket传输 } from './WebSocket传输'
import { 信标传输 } from './信标传输'
import { 安装全局错误处理器 } from './全局错误处理器'
export { 环形缓冲实例, 追踪器实例, 日志存储实例 }

export async function 初始化可观测性(): Promise<void> {
  安装全局错误处理器()
  await 日志存储实例.open()

  if (import.meta.env.DEV) {
    const ws = new WebSocket传输(环形缓冲实例)
    ws.connect()
  }

  if (import.meta.env.PROD) {
    const beacon = new 信标传输(环形缓冲实例, 日志存储实例)
    beacon.start()
  }

  环形缓冲实例.write('info', 1, 'Observability initialized', {
    mode: import.meta.env.DEV ? 'dev' : 'prod',
  })
}

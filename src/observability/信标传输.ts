import { encode } from '@msgpack/msgpack'
import type { 环形缓冲, 日志条目 } from './环形缓冲'
import type { 日志存储 } from './持久化'
import { 解析可信上报端点 } from './上报端点校验'

const 默认间隔 = 30000
const DEFAULT_ENDPOINT = '/api/observability/logs'

export class 信标传输 {
  private store: 日志存储
  private endpoint: string
  private timer: ReturnType<typeof setInterval> | null = null
  private _running = false

  constructor(_ringBuffer: 环形缓冲, store: 日志存储, endpoint?: string) {
    this.store = store
    // 外部输入（env 覆盖）必须过可信性校验，不信任则回落同源默认端点
    this.endpoint =
      解析可信上报端点(
        endpoint ?? (import.meta as { env?: Record<string, string> }).env?.VITE_OBSERVABILITY_ENDPOINT
      ) ?? DEFAULT_ENDPOINT
  }

  start(intervalMs: number = 默认间隔): void {
    if (this._running) return
    this._running = true
    this.timer = setInterval(() => {
      this.flush()
    }, intervalMs)
  }

  stop(): void {
    this._running = false
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  async flush(): Promise<void> {
    try {
      const entries = await this.store.getUnreportedEntries()
      if (entries.length === 0) return

      const plain = entries.map((e) => ({ ...e, timestamp: Number(e.timestamp) }))
      const encoded = encode(plain)
      const blob = new Blob([encoded], { type: 'application/msgpack' })
      const sent = navigator.sendBeacon(this.endpoint, blob)

      if (sent) {
        const ids = (entries as (日志条目 & { id?: string })[])
          .map((e) => (e as { id?: string }).id)
          .filter((id): id is string => id !== undefined)
        if (ids.length > 0) {
          await this.store.markReported(ids)
        }
      }
    } catch {
      // 静默失败：后台上报不应影响主流程
    }
  }
}

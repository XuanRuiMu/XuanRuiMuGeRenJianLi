import { encode } from '@msgpack/msgpack'
import type { RingBuffer, LogEntry } from './ringBuffer'
import type { LogStore } from './persistence'

const DEFAULT_INTERVAL = 30000
const DEFAULT_ENDPOINT = '/api/observability/logs'

export class BeaconTransport {
  private store: LogStore
  private endpoint: string
  private timer: ReturnType<typeof setInterval> | null = null
  private _running = false

  constructor(_ringBuffer: RingBuffer, store: LogStore, endpoint?: string) {
    this.store = store
    this.endpoint =
      endpoint ?? (import.meta as { env?: Record<string, string> }).env?.VITE_OBSERVABILITY_ENDPOINT ?? DEFAULT_ENDPOINT
  }

  start(intervalMs: number = DEFAULT_INTERVAL): void {
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
        const ids = (entries as (LogEntry & { id?: string })[])
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

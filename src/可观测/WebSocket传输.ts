import { encode } from '@msgpack/msgpack'
import type { 环形缓冲, 日志条目 } from './环形缓冲'

const 最大重连次数 = 5
const 重连延迟 = 3000
const 心跳间隔 = 30000

export class WebSocket传输 {
  private ws: WebSocket | null = null
  private 环形缓冲实例: 环形缓冲
  private unsubscribe: (() => void) | null = null
  private reconnectAttempts = 0
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private shouldReconnect = false
  private _connected = false

  constructor(环形缓冲: 环形缓冲) {
    this.环形缓冲实例 = 环形缓冲
  }

  get connected(): boolean {
    return this._connected
  }

  connect(): Promise<void> {
    this.shouldReconnect = true
    return this.doConnect()
  }

  private doConnect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
      const url = `${protocol}//${location.hostname}:${location.port}/__observability`
      const ws = new WebSocket(url)
      ws.binaryType = 'arraybuffer'

      ws.onopen = () => {
        this.ws = ws
        this._connected = true
        this.reconnectAttempts = 0
        this.startHeartbeat()
        this.subscribeToRingBuffer()
        resolve()
      }

      ws.onclose = () => {
        this._connected = false
        this.stopHeartbeat()
        if (this.shouldReconnect && this.reconnectAttempts < 最大重连次数) {
          this.reconnectAttempts++
          setTimeout(() => this.doConnect(), 重连延迟)
        }
      }

      ws.onerror = () => {
        if (!this.ws) {
          reject(new Error('WebSocket connection failed'))
        }
      }
    })
  }

  disconnect(): void {
    this.shouldReconnect = false
    this.stopHeartbeat()
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this._connected = false
  }

  private subscribeToRingBuffer(): void {
    if (this.unsubscribe) return
    this.unsubscribe = this.环形缓冲实例.subscribe((entry: 日志条目) => {
      this.sendEntry(entry)
    })
  }

  private sendEntry(entry: 日志条目): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const plain = { ...entry, timestamp: Number(entry.timestamp) }
    const entryEncoded = encode(plain)
    const message = encode({ type: 'log', data: entryEncoded })
    this.ws.send(message)
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(encode({ type: 'ping' }))
      }
    }, 心跳间隔)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
}

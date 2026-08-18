import { encode } from '@msgpack/msgpack'
import type { RingBuffer, LogEntry } from './ringBuffer'

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 3000
const HEARTBEAT_INTERVAL = 30000

export class WsTransport {
  private ws: WebSocket | null = null
  private ringBuffer: RingBuffer
  private unsubscribe: (() => void) | null = null
  private reconnectAttempts = 0
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private shouldReconnect = false
  private _connected = false

  constructor(ringBuffer: RingBuffer) {
    this.ringBuffer = ringBuffer
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
        if (this.shouldReconnect && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++
          setTimeout(() => this.doConnect(), RECONNECT_DELAY)
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
    this.unsubscribe = this.ringBuffer.subscribe((entry: LogEntry) => {
      this.sendEntry(entry)
    })
  }

  private sendEntry(entry: LogEntry): void {
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
    }, HEARTBEAT_INTERVAL)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
}

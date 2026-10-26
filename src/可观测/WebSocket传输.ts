import { encode } from '@msgpack/msgpack'
import type { 环形缓冲, 日志条目 } from './环形缓冲'

const 最大重连次数 = 5
const 重连延迟 = 3000
const 心跳间隔 = 30000

export class WebSocket传输 {
  private 套接字: WebSocket | null = null
  private 环形缓冲实例: 环形缓冲
  private 取消订阅: (() => void) | null = null
  private 重连次数 = 0
  private 心跳定时器: ReturnType<typeof setInterval> | null = null
  private 应重连 = false
  private 连接状态 = false

  constructor(环形缓冲: 环形缓冲) {
    this.环形缓冲实例 = 环形缓冲
  }

  get 已连接(): boolean {
    return this.连接状态
  }

  connect(): Promise<void> {
    this.应重连 = true
    return this.执行连接()
  }

  private 执行连接(): Promise<void> {
    return new Promise<void>((完成, 拒绝) => {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
      const 地址 = `${protocol}//${location.hostname}:${location.port}/__observability`
      const 套接字 = new WebSocket(地址)
      套接字.binaryType = 'arraybuffer'

      套接字.onopen = () => {
        this.套接字 = 套接字
        this.连接状态 = true
        this.重连次数 = 0
        this.开始心跳()
        this.订阅环形缓冲()
        完成()
      }

      套接字.onclose = () => {
        this.连接状态 = false
        this.停止心跳()
        if (this.应重连 && this.重连次数 < 最大重连次数) {
          this.重连次数++
          setTimeout(() => this.执行连接(), 重连延迟)
        }
      }

      套接字.onerror = () => {
        if (!this.套接字) {
          拒绝(new Error('WebSocket connection failed'))
        }
      }
    })
  }

  断开(): void {
    this.应重连 = false
    this.停止心跳()
    if (this.取消订阅) {
      this.取消订阅()
      this.取消订阅 = null
    }
    if (this.套接字) {
      this.套接字.close()
      this.套接字 = null
    }
    this.连接状态 = false
  }

  private 订阅环形缓冲(): void {
    if (this.取消订阅) return
    this.取消订阅 = this.环形缓冲实例.订阅((条目: 日志条目) => {
      this.发送条目(条目)
    })
  }

  private 发送条目(条目: 日志条目): void {
    if (!this.套接字 || this.套接字.readyState !== WebSocket.OPEN) return
    const 明文 = { ...条目, timestamp: Number(条目.timestamp) }
    const 条目编码 = encode(明文)
    const 消息 = encode({ type: 'log', data: 条目编码 })
    this.套接字.send(消息)
  }

  private 开始心跳(): void {
    this.停止心跳()
    this.心跳定时器 = setInterval(() => {
      if (this.套接字 && this.套接字.readyState === WebSocket.OPEN) {
        this.套接字.send(encode({ type: 'ping' }))
      }
    }, 心跳间隔)
  }

  private 停止心跳(): void {
    if (this.心跳定时器 !== null) {
      clearInterval(this.心跳定时器)
      this.心跳定时器 = null
    }
  }
}

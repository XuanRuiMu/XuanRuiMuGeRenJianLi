import { encode } from '@msgpack/msgpack'
import type { 环形缓冲, 日志条目 } from './环形缓冲'
import type { 日志存储 } from './持久化'
import { 解析可信上报端点 } from './上报端点校验'

const 默认间隔 = 30000
const 默认端点 = '/api/可观测/logs'

export class 信标传输 {
  private 仓库: 日志存储
  private 端点: string
  private 定时器: ReturnType<typeof setInterval> | null = null
  private 运行中 = false

  constructor(_环形缓冲: 环形缓冲, 仓库: 日志存储, 端点?: string) {
    this.仓库 = 仓库

    this.端点 =
      解析可信上报端点(端点 ?? (import.meta as { env?: Record<string, string> }).env?.VITE_OBSERVABILITY_ENDPOINT) ??
      默认端点
  }

  开始(间隔毫秒: number = 默认间隔): void {
    if (this.运行中) return
    this.运行中 = true
    this.定时器 = setInterval(() => {
      this.刷新()
    }, 间隔毫秒)
  }

  停止(): void {
    this.运行中 = false
    if (this.定时器 !== null) {
      clearInterval(this.定时器)
      this.定时器 = null
    }
  }

  async 刷新(): Promise<void> {
    try {
      const 条目表 = await this.仓库.获取未上报条目()
      if (条目表.length === 0) return

      const 明文 = 条目表.map((e) => ({ ...e, timestamp: Number(e.timestamp) }))
      const 已编码 = encode(明文)
      const 数据块 = new Blob([已编码], { type: 'application/msgpack' })
      const 已发送 = navigator.sendBeacon(this.端点, 数据块)

      if (已发送) {
        const 编号表 = (条目表 as (日志条目 & { id?: string })[])
          .map((e) => (e as { id?: string }).id)
          .filter((id): id is string => id !== undefined)
        if (编号表.length > 0) {
          await this.仓库.标记已上报(编号表)
        }
      }
    } catch {}
  }
}

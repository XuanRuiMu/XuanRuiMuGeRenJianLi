import type { 环形缓冲 } from './环形缓冲'
import { 日志分类 } from './环形缓冲'

export interface 跨度 {
  spanId: number
  traceId: number
  parentSpanId: number | null
  name: string
  startTime: bigint
  endTime?: bigint
  status: 'ok' | 'error' | 'unset'
  metadata?: Record<string, unknown>
}

export class 追踪器 {
  private 下一个跨度编号 = 1
  private 活跃跨度表 = new Map<number, 跨度>()
  private 已完成跨度表: 跨度[] = []
  private 性能起始时刻表 = new Map<number, number>()

  constructor(private 环形缓冲: 环形缓冲) {}

  开始跨度(name: string, 父跨度编号?: number, 元数据?: Record<string, unknown>): number {
    const 跨度编号 = this.下一个跨度编号++
    let 父编号 = 父跨度编号 ?? null

    if (父编号 === null && this.活跃跨度表.size > 0) {
      let 最内层: 跨度 | null = null
      let 最大编号 = -1
      for (const 跨度 of this.活跃跨度表.values()) {
        if (跨度.spanId > 最大编号) {
          最大编号 = 跨度.spanId
          最内层 = 跨度
        }
      }
      if (最内层) 父编号 = 最内层.spanId
    }

    const 追踪编号 = 父编号 === null ? 跨度编号 : this.解析追踪编号(父编号)
    const 起始时刻 = BigInt(Date.now())

    const 跨度: 跨度 = {
      spanId: 跨度编号,
      traceId: 追踪编号,
      parentSpanId: 父编号,
      name,
      startTime: 起始时刻,
      status: 'unset',
      metadata: 元数据,
    }
    this.活跃跨度表.set(跨度编号, 跨度)
    this.性能起始时刻表.set(跨度编号, performance.now())

    this.环形缓冲.写入('info', 日志分类.运行时分类, `[span:start] ${name}`, { spanId: 跨度编号 }, 跨度编号)
    return 跨度编号
  }

  结束跨度(跨度编号: number, 状态?: 'ok' | 'error', 最终元数据?: Record<string, unknown>): void {
    const 跨度 = this.活跃跨度表.get(跨度编号)
    if (!跨度) return

    const 结束时刻 = BigInt(Date.now())
    跨度.endTime = 结束时刻
    跨度.status = 状态 ?? 'ok'

    if (最终元数据) {
      跨度.metadata = { ...跨度.metadata, ...最终元数据 }
    }

    const 性能起始 = this.性能起始时刻表.get(跨度编号) ?? 0
    const 持续时长 = Math.round((performance.now() - 性能起始) * 1000)

    this.活跃跨度表.delete(跨度编号)
    this.已完成跨度表.push(跨度)
    this.性能起始时刻表.delete(跨度编号)

    this.环形缓冲.写入(
      'info',
      日志分类.运行时分类,
      `[span:end] ${跨度.name}`,
      { spanId: 跨度编号, duration: 持续时长 },
      跨度编号
    )
  }

  获取当前跨度(): 跨度 | null {
    if (this.活跃跨度表.size === 0) return null
    let 最内层: 跨度 | null = null
    let 最大编号 = -1
    for (const 跨度 of this.活跃跨度表.values()) {
      if (跨度.spanId > 最大编号) {
        最大编号 = 跨度.spanId
        最内层 = 跨度
      }
    }
    return 最内层
  }

  获取跨度表(): 跨度[] {
    return [...this.活跃跨度表.values(), ...this.已完成跨度表]
  }

  修剪(): void {
    if (this.已完成跨度表.length > 100) {
      this.已完成跨度表 = this.已完成跨度表.slice(-100)
    }
  }

  private 解析追踪编号(跨度编号: number): number {
    const 跨度 = this.活跃跨度表.get(跨度编号) ?? this.已完成跨度表.find((s) => s.spanId === 跨度编号)
    if (!跨度) return 跨度编号
    if (跨度.parentSpanId === null) return 跨度.spanId
    const 父级 = this.活跃跨度表.get(跨度.parentSpanId) ?? this.已完成跨度表.find((s) => s.spanId === 跨度.parentSpanId)
    if (父级) return 父级.traceId
    return this.解析追踪编号(跨度.parentSpanId)
  }
}

export function 包裹跨度<T>(
  追踪器实例: 追踪器,
  name: string,
  函数: () => Promise<T>,
  元数据?: Record<string, unknown>
): Promise<T> {
  const 跨度编号 = 追踪器实例.开始跨度(name, undefined, 元数据)
  return 函数()
    .then((结果) => {
      追踪器实例.结束跨度(跨度编号, 'ok')
      return 结果
    })
    .catch((错误) => {
      追踪器实例.结束跨度(跨度编号, 'error')
      throw 错误
    })
}

import { encode, decode } from '@msgpack/msgpack'
import type { 日志条目, 日志级别 } from './环形缓冲'
import type { 跨度 } from './追踪器'

const 默认数据库名 = 'xrm-observability'
const 批大小 = 500

interface 已存日志 {
  id: string
  timestamp: number
  level: string
  category: number
  spanId: number
  data: ArrayBuffer
  source?: string
}

interface 已存跨度 {
  spanId: number
  traceId: number
  parentSpanId: number | null
  name: string
  startTime: number
  endTime?: number
  status: string
  metadata?: Record<string, unknown>
}

interface 已上报条目 {
  id: string
  timestamp: number
}

function 日志条目转存储(条目: 日志条目): 已存日志 {
  const id = (条目 as 日志条目 & { id?: string }).id ?? crypto.randomUUID()
  const 数据 = encode({ message: 条目.message, context: 条目.context, source: 条目.source })
  return {
    id,
    timestamp: Number(条目.timestamp),
    level: 条目.level,
    category: 条目.category as number,
    spanId: 条目.spanId,
    data: 数据.buffer.slice(数据.byteOffset, 数据.byteOffset + 数据.byteLength),
    source: 条目.source,
  }
}

function 存储转日志条目(已存: 已存日志): 日志条目 & { id: string } {
  const 已解码 = decode(new Uint8Array(已存.data)) as {
    message: string
    context?: Record<string, unknown>
    source?: string
  }
  const 条目: 日志条目 & { id: string } = {
    id: 已存.id,
    timestamp: BigInt(已存.timestamp),
    level: 已存.level as 日志级别,
    category: 已存.category as 日志条目['category'],
    spanId: 已存.spanId,
    message: 已解码.message,
  }
  if (已解码.context) 条目.context = 已解码.context
  if (已存.source) 条目.source = 已存.source
  if (已解码.source) 条目.source = 已解码.source
  return 条目
}

function 跨度转存储(跨度: 跨度): 已存跨度 {
  return {
    spanId: 跨度.spanId,
    traceId: 跨度.traceId,
    parentSpanId: 跨度.parentSpanId,
    name: 跨度.name,
    startTime: Number(跨度.startTime),
    endTime: 跨度.endTime !== undefined ? Number(跨度.endTime) : undefined,
    status: 跨度.status,
    metadata: 跨度.metadata,
  }
}

function 存储转跨度(已存: 已存跨度): 跨度 {
  return {
    spanId: 已存.spanId,
    traceId: 已存.traceId,
    parentSpanId: 已存.parentSpanId,
    name: 已存.name,
    startTime: BigInt(已存.startTime),
    endTime: 已存.endTime !== undefined ? BigInt(已存.endTime) : undefined,
    status: 已存.status as 跨度['status'],
    metadata: 已存.metadata,
  }
}

export class 日志存储 {
  private 数据库: IDBDatabase | null = null
  private 数据库名: string
  private 打开承诺: Promise<void> | null = null

  constructor(数据库名?: string) {
    this.数据库名 = 数据库名 ?? 默认数据库名
  }

  open(): Promise<void> {
    if (this.打开承诺) return this.打开承诺
    this.打开承诺 = new Promise<void>((完成, 拒绝) => {
      const 请求 = indexedDB.open(this.数据库名, 1)
      请求.onupgradeneeded = () => {
        const 数据库 = 请求.result
        if (!数据库.objectStoreNames.contains('logs')) {
          const 日志存储实例 = 数据库.createObjectStore('logs', { keyPath: 'id' })
          日志存储实例.createIndex('timestamp', 'timestamp', { unique: false })
          日志存储实例.createIndex('level', 'level', { unique: false })
          日志存储实例.createIndex('spanId', 'spanId', { unique: false })
        }
        if (!数据库.objectStoreNames.contains('spans')) {
          const 跨度仓库 = 数据库.createObjectStore('spans', { keyPath: 'spanId' })
          跨度仓库.createIndex('timestamp', 'startTime', { unique: false })
        }
        if (!数据库.objectStoreNames.contains('meta')) {
          数据库.createObjectStore('meta', { keyPath: 'id' })
        }
      }
      请求.onsuccess = () => {
        this.数据库 = 请求.result
        完成()
      }
      请求.onerror = () => 拒绝(请求.error)
    })
    return this.打开承诺
  }

  private async 确保打开(): Promise<IDBDatabase> {
    if (this.数据库) return this.数据库
    await this.open()
    return this.数据库!
  }

  async 写入条目(条目表: 日志条目[]): Promise<void> {
    const 数据库 = await this.确保打开()
    for (let i = 0; i < 条目表.length; i += 批大小) {
      const 批次 = 条目表.slice(i, i + 批大小)
      await new Promise<void>((完成, 拒绝) => {
        const 事务 = 数据库.transaction('logs', 'readwrite')
        const 仓库 = 事务.objectStore('logs')
        for (const 条目 of 批次) {
          仓库.put(日志条目转存储(条目))
        }
        事务.oncomplete = () => 完成()
        事务.onerror = () => 拒绝(事务.error)
      })
    }
  }

  async 写入跨度(跨度表: 跨度[]): Promise<void> {
    const 数据库 = await this.确保打开()
    for (let i = 0; i < 跨度表.length; i += 批大小) {
      const 批次 = 跨度表.slice(i, i + 批大小)
      await new Promise<void>((完成, 拒绝) => {
        const 事务 = 数据库.transaction('spans', 'readwrite')
        const 仓库 = 事务.objectStore('spans')
        for (const 跨度 of 批次) {
          仓库.put(跨度转存储(跨度))
        }
        事务.oncomplete = () => 完成()
        事务.onerror = () => 拒绝(事务.error)
      })
    }
  }

  async 读取条目(上限: number = 100): Promise<日志条目[]> {
    const 数据库 = await this.确保打开()
    return new Promise<日志条目[]>((完成, 拒绝) => {
      const 事务 = 数据库.transaction('logs', 'readonly')
      const 仓库 = 事务.objectStore('logs')
      const 下标 = 仓库.index('timestamp')
      const 请求 = 下标.openCursor(null, 'prev')
      const 结果表: 日志条目[] = []
      请求.onsuccess = () => {
        const 游标 = 请求.result
        if (游标 && 结果表.length < 上限) {
          结果表.push(存储转日志条目(游标.value as 已存日志))
          游标.continue()
        } else {
          完成(结果表)
        }
      }
      请求.onerror = () => 拒绝(请求.error)
    })
  }

  async 读取跨度(上限: number = 100): Promise<跨度[]> {
    const 数据库 = await this.确保打开()
    return new Promise<跨度[]>((完成, 拒绝) => {
      const 事务 = 数据库.transaction('spans', 'readonly')
      const 仓库 = 事务.objectStore('spans')
      const 下标 = 仓库.index('timestamp')
      const 请求 = 下标.openCursor(null, 'prev')
      const 结果表: 跨度[] = []
      请求.onsuccess = () => {
        const 游标 = 请求.result
        if (游标 && 结果表.length < 上限) {
          结果表.push(存储转跨度(游标.value as 已存跨度))
          游标.continue()
        } else {
          完成(结果表)
        }
      }
      请求.onerror = () => 拒绝(请求.error)
    })
  }

  async 按级别查询(级别: 日志级别, 上限: number = 100): Promise<日志条目[]> {
    const 数据库 = await this.确保打开()
    return new Promise<日志条目[]>((完成, 拒绝) => {
      const 事务 = 数据库.transaction('logs', 'readonly')
      const 仓库 = 事务.objectStore('logs')
      const 下标 = 仓库.index('level')
      const 请求 = 下标.getAll(级别, 上限)
      请求.onsuccess = () => {
        const 已存 = (请求.result as 已存日志[]).sort((a, b) => b.timestamp - a.timestamp)
        完成(已存.map(存储转日志条目))
      }
      请求.onerror = () => 拒绝(请求.error)
    })
  }

  async 按跨度编号查询(跨度编号: number): Promise<日志条目[]> {
    const 数据库 = await this.确保打开()
    return new Promise<日志条目[]>((完成, 拒绝) => {
      const 事务 = 数据库.transaction('logs', 'readonly')
      const 仓库 = 事务.objectStore('logs')
      const 下标 = 仓库.index('spanId')
      const 请求 = 下标.getAll(跨度编号)
      请求.onsuccess = () => {
        const 已存 = (请求.result as 已存日志[]).sort((a, b) => b.timestamp - a.timestamp)
        完成(已存.map(存储转日志条目))
      }
      请求.onerror = () => 拒绝(请求.error)
    })
  }

  async 获取未上报条目(): Promise<日志条目[]> {
    const 数据库 = await this.确保打开()
    const 事务 = 数据库.transaction(['logs', 'meta'], 'readonly')
    const 日志存储实例 = 事务.objectStore('logs')
    const 元数据仓库 = 事务.objectStore('meta')

    const 全部日志请求 = 日志存储实例.getAll()
    const 已上报请求 = 元数据仓库.getAll()

    const [全部日志, 已上报] = await Promise.all([
      new Promise<已存日志[]>((完成, 拒绝) => {
        全部日志请求.onsuccess = () => 完成(全部日志请求.result as 已存日志[])
        全部日志请求.onerror = () => 拒绝(全部日志请求.error)
      }),
      new Promise<已上报条目[]>((完成, 拒绝) => {
        已上报请求.onsuccess = () => 完成(已上报请求.result as 已上报条目[])
        已上报请求.onerror = () => 拒绝(已上报请求.error)
      }),
    ])

    const 已上报集合 = new Set(已上报.map((r) => r.id))
    const 未上报 = 全部日志.filter((s) => !已上报集合.has(s.id)).sort((a, b) => a.timestamp - b.timestamp)
    return 未上报.map(存储转日志条目)
  }

  async 标记已上报(条目编号表: string[]): Promise<void> {
    if (条目编号表.length === 0) return
    const 数据库 = await this.确保打开()
    const 当前时刻 = Date.now()
    for (let i = 0; i < 条目编号表.length; i += 批大小) {
      const 批次 = 条目编号表.slice(i, i + 批大小)
      await new Promise<void>((完成, 拒绝) => {
        const 事务 = 数据库.transaction('meta', 'readwrite')
        const 仓库 = 事务.objectStore('meta')
        for (const id of 批次) {
          仓库.put({ id, timestamp: 当前时刻 } satisfies 已上报条目)
        }
        事务.oncomplete = () => 完成()
        事务.onerror = () => 拒绝(事务.error)
      })
    }
  }

  async 获取统计(): Promise<{ entryCount: number; spanCount: number; dbSize: number }> {
    const 数据库 = await this.确保打开()
    const 事务 = 数据库.transaction(['logs', 'spans', 'meta'], 'readonly')
    const 日志存储实例 = 事务.objectStore('logs')
    const 跨度仓库 = 事务.objectStore('spans')
    const 元数据仓库 = 事务.objectStore('meta')

    const [条目数, 跨度数, 元数据数量] = await Promise.all([
      new Promise<number>((完成, 拒绝) => {
        const 请求 = 日志存储实例.count()
        请求.onsuccess = () => 完成(请求.result)
        请求.onerror = () => 拒绝(请求.error)
      }),
      new Promise<number>((完成, 拒绝) => {
        const 请求 = 跨度仓库.count()
        请求.onsuccess = () => 完成(请求.result)
        请求.onerror = () => 拒绝(请求.error)
      }),
      new Promise<number>((完成, 拒绝) => {
        const 请求 = 元数据仓库.count()
        请求.onsuccess = () => 完成(请求.result)
        请求.onerror = () => 拒绝(请求.error)
      }),
    ])

    const 每条目估算 = 256
    const 数据库大小 = (条目数 + 跨度数 + 元数据数量) * 每条目估算
    return { entryCount: 条目数, spanCount: 跨度数, dbSize: 数据库大小 }
  }

  关闭(): void {
    if (this.数据库) {
      this.数据库.close()
      this.数据库 = null
      this.打开承诺 = null
    }
  }
}

import { encode, decode } from '@msgpack/msgpack'

export type 日志级别 = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export enum 日志分类 {
  渲染分类 = 0,
  运行时分类 = 1,
  网络分类 = 2,
  三维渲染分类 = 3,
  音频分类 = 4,
  未知分类 = 5,
  其他分类 = 99,
}

export interface 日志条目 {
  timestamp: bigint
  level: 日志级别
  category: 日志分类
  spanId: number
  message: string
  context?: Record<string, unknown>
  source?: string
}

interface 日志详情 {
  message: string
  context?: Record<string, unknown>
  source?: string
}

const 头部长度 = 18
const 最大数据长度 = 60000

const 级别映射表: Record<number, 日志级别> = {
  0: 'debug',
  1: 'info',
  2: 'warn',
  3: 'error',
  4: 'fatal',
}

const 级别编号表: Record<日志级别, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
}

export class 环形缓冲 {
  private buffer: ArrayBuffer
  private 视图: DataView
  private u8: Uint8Array
  private 写入偏移 = 0
  private 读取偏移 = 0
  private 订阅者表: Set<(条目: 日志条目) => void>

  constructor(容量: number = 128 * 1024) {
    this.buffer = new ArrayBuffer(容量)
    this.视图 = new DataView(this.buffer)
    this.u8 = new Uint8Array(this.buffer)
    this.订阅者表 = new Set()
  }

  写入(级别: 日志级别, 分类: number, 消息: string, 上下文?: Record<string, unknown>, 跨度编号?: number): void {
    const 细节: 日志详情 = { message: 消息 }
    if (上下文 && Object.keys(上下文).length > 0) {
      细节.context = 上下文
    }
    if (级别 === 'warn' || 级别 === 'error' || 级别 === 'fatal') {
      const 来源 = this.捕获调用栈()
      if (来源) 细节.source = 来源
    }

    const 已打包 = encode(细节) as Uint8Array
    let 数据长度 = 已打包.byteLength
    if (数据长度 > 最大数据长度) 数据长度 = 最大数据长度

    const 条目长度 = 头部长度 + 数据长度
    if (条目长度 > this.buffer.byteLength) return

    const 剩余 = this.buffer.byteLength - this.写入偏移
    if (条目长度 > 剩余) {
      if (剩余 >= 头部长度) {
        this.写入哨兵(this.写入偏移)
      }
      this.写入偏移 = 0
    }

    const 时间戳 = BigInt(Date.now())
    this.视图.setBigUint64(this.写入偏移, 时间戳)
    this.视图.setUint8(this.写入偏移 + 8, 级别编号表[级别])
    this.视图.setUint8(this.写入偏移 + 9, 分类)
    this.视图.setUint32(this.写入偏移 + 10, 跨度编号 ?? 0)
    this.视图.setUint16(this.写入偏移 + 14, 数据长度)

    if (数据长度 > 0) {
      this.u8.set(已打包.subarray(0, 数据长度), this.写入偏移 + 头部长度)
    }

    this.写入偏移 += 条目长度

    if (this.订阅者表.size > 0) {
      const 条目: 日志条目 = {
        timestamp: 时间戳,
        level: 级别,
        category: 分类 as 日志分类,
        spanId: 跨度编号 ?? 0,
        message: 消息,
      }
      if (上下文 && Object.keys(上下文).length > 0) {
        条目.context = 上下文
      }
      if (细节.source) 条目.source = 细节.source
      for (const 回调 of this.订阅者表) {
        try {
          回调(条目)
        } catch {}
      }
    }
  }

  读取(): 日志条目[] {
    if (this.读取偏移 === this.写入偏移) return []

    const 条目表: 日志条目[] = []
    const 缓冲长度 = this.buffer.byteLength
    let 偏移 = this.读取偏移

    if (this.写入偏移 < this.读取偏移) {
      for (;;) {
        if (偏移 >= 缓冲长度) {
          偏移 = 0
          break
        }
        const 数据长度 = this.视图.getUint16(偏移 + 14)
        if (数据长度 === 0) {
          偏移 = 0
          break
        }
        const 条目长度 = 头部长度 + 数据长度
        if (偏移 + 条目长度 > 缓冲长度) {
          偏移 = 0
          break
        }
        const 条目 = this.解析指定位置条目(偏移)
        if (条目) 条目表.push(条目)
        偏移 += 条目长度
      }
    }

    while (偏移 < this.写入偏移) {
      const 数据长度 = this.视图.getUint16(偏移 + 14)
      if (数据长度 === 0) {
        偏移 = 0
        continue
      }
      const 条目长度 = 头部长度 + 数据长度
      if (偏移 + 条目长度 > this.写入偏移) break
      const 条目 = this.解析指定位置条目(偏移)
      if (条目) 条目表.push(条目)
      偏移 += 条目长度
    }

    this.读取偏移 = this.写入偏移
    return 条目表
  }

  清空(): void {
    this.写入偏移 = 0
    this.读取偏移 = 0
  }

  get 未读字节(): number {
    if (this.读取偏移 <= this.写入偏移) {
      return this.写入偏移 - this.读取偏移
    }
    return this.buffer.byteLength - this.读取偏移 + this.写入偏移
  }

  订阅(回调: (条目: 日志条目) => void): () => void {
    this.订阅者表.add(回调)
    return () => {
      this.订阅者表.delete(回调)
    }
  }

  快照数据(): ArrayBuffer {
    return this.buffer.slice(0, this.写入偏移)
  }

  private 写入哨兵(偏移: number): void {
    this.视图.setUint16(偏移 + 14, 0)
  }

  private 解析指定位置条目(偏移: number): 日志条目 | null {
    if (偏移 + 头部长度 > this.buffer.byteLength) return null

    const 数据长度 = this.视图.getUint16(偏移 + 14)
    if (数据长度 === 0) return null

    const 时间戳 = this.视图.getBigUint64(偏移)
    const 级别编号 = this.视图.getUint8(偏移 + 8)
    const 分类编号 = this.视图.getUint8(偏移 + 9)
    const 跨度编号 = this.视图.getUint32(偏移 + 10)

    let 消息 = ''
    let 上下文: Record<string, unknown> | undefined
    let 来源: string | undefined

    if (数据长度 > 0) {
      const slice = this.u8.slice(偏移 + 头部长度, 偏移 + 头部长度 + 数据长度)
      const 已解码 = decode(slice) as Record<string, unknown>
      消息 = String(已解码.message ?? '')
      if (已解码.context && typeof 已解码.context === 'object') {
        上下文 = 已解码.context as Record<string, unknown>
      }
      if (已解码.source && typeof 已解码.source === 'string') {
        来源 = 已解码.source
      }
    }

    const 条目: 日志条目 = {
      timestamp: 时间戳,
      level: 级别映射表[级别编号] ?? 'info',
      category: 分类编号 as 日志分类,
      spanId: 跨度编号,
      message: 消息,
    }
    if (上下文) 条目.context = 上下文
    if (来源) 条目.source = 来源
    return 条目
  }

  private 捕获调用栈(): string | undefined {
    try {
      const 栈 = new Error().stack?.split('\n') ?? []
      for (const 行 of 栈.slice(2)) {
        const 已修剪 = 行.trim().replace(/^at\s+/, '')
        if (!已修剪.includes('ringBuffer') && !已修剪.includes('observability')) {
          return 已修剪
        }
      }
      return undefined
    } catch {
      return undefined
    }
  }
}

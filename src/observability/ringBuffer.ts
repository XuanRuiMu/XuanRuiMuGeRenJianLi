import { encode, decode } from '@msgpack/msgpack'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export enum LogCategory {
  Render = 0,
  Runtime = 1,
  Network = 2,
  WebGL = 3,
  Audio = 4,
  Unknown = 5,
  Other = 99,
}

export interface LogEntry {
  timestamp: bigint
  level: LogLevel
  category: LogCategory
  spanId: number
  message: string
  context?: Record<string, unknown>
  source?: string
}

interface LogDetail {
  message: string
  context?: Record<string, unknown>
  source?: string
}

const HEADER_SIZE = 18
const MAX_DATA_LEN = 60000

const LEVEL_MAP: Record<number, LogLevel> = {
  0: 'debug',
  1: 'info',
  2: 'warn',
  3: 'error',
  4: 'fatal',
}

const LEVEL_TO_NUM: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
}

export class RingBuffer {
  private buffer: ArrayBuffer
  private view: DataView
  private u8: Uint8Array
  private writeOffset = 0
  private readOffset = 0
  private subscribers: Set<(entry: LogEntry) => void>

  constructor(capacity: number = 128 * 1024) {
    this.buffer = new ArrayBuffer(capacity)
    this.view = new DataView(this.buffer)
    this.u8 = new Uint8Array(this.buffer)
    this.subscribers = new Set()
  }

  write(level: LogLevel, category: number, message: string, context?: Record<string, unknown>, spanId?: number): void {
    const detail: LogDetail = { message }
    if (context && Object.keys(context).length > 0) {
      detail.context = context
    }
    if (level === 'warn' || level === 'error' || level === 'fatal') {
      const source = this.captureCaller()
      if (source) detail.source = source
    }

    const packed = encode(detail) as Uint8Array
    let dataLen = packed.byteLength
    if (dataLen > MAX_DATA_LEN) dataLen = MAX_DATA_LEN

    const entryLen = HEADER_SIZE + dataLen
    if (entryLen > this.buffer.byteLength) return

    const remaining = this.buffer.byteLength - this.writeOffset
    if (entryLen > remaining) {
      if (remaining >= HEADER_SIZE) {
        this.writeSentinel(this.writeOffset)
      }
      this.writeOffset = 0
    }

    const ts = BigInt(Date.now())
    this.view.setBigUint64(this.writeOffset, ts)
    this.view.setUint8(this.writeOffset + 8, LEVEL_TO_NUM[level])
    this.view.setUint8(this.writeOffset + 9, category)
    this.view.setUint32(this.writeOffset + 10, spanId ?? 0)
    this.view.setUint16(this.writeOffset + 14, dataLen)

    if (dataLen > 0) {
      this.u8.set(packed.subarray(0, dataLen), this.writeOffset + HEADER_SIZE)
    }

    this.writeOffset += entryLen

    if (this.subscribers.size > 0) {
      const entry: LogEntry = {
        timestamp: ts,
        level,
        category: category as LogCategory,
        spanId: spanId ?? 0,
        message,
      }
      if (context && Object.keys(context).length > 0) {
        entry.context = context
      }
      if (detail.source) entry.source = detail.source
      for (const cb of this.subscribers) {
        try {
          cb(entry)
        } catch {
          /* ignore subscriber error */
        }
      }
    }
  }

  read(): LogEntry[] {
    if (this.readOffset === this.writeOffset) return []

    const entries: LogEntry[] = []
    const bufLen = this.buffer.byteLength
    let offset = this.readOffset

    if (this.writeOffset < this.readOffset) {
      for (;;) {
        if (offset >= bufLen) {
          offset = 0
          break
        }
        const dataLen = this.view.getUint16(offset + 14)
        if (dataLen === 0) {
          offset = 0
          break
        }
        const entryLen = HEADER_SIZE + dataLen
        if (offset + entryLen > bufLen) {
          offset = 0
          break
        }
        const entry = this.parseEntryAt(offset)
        if (entry) entries.push(entry)
        offset += entryLen
      }
    }

    while (offset < this.writeOffset) {
      const dataLen = this.view.getUint16(offset + 14)
      if (dataLen === 0) {
        offset = 0
        continue
      }
      const entryLen = HEADER_SIZE + dataLen
      if (offset + entryLen > this.writeOffset) break
      const entry = this.parseEntryAt(offset)
      if (entry) entries.push(entry)
      offset += entryLen
    }

    this.readOffset = this.writeOffset
    return entries
  }

  clear(): void {
    this.writeOffset = 0
    this.readOffset = 0
  }

  get unreadBytes(): number {
    if (this.readOffset <= this.writeOffset) {
      return this.writeOffset - this.readOffset
    }
    return this.buffer.byteLength - this.readOffset + this.writeOffset
  }

  subscribe(cb: (entry: LogEntry) => void): () => void {
    this.subscribers.add(cb)
    return () => {
      this.subscribers.delete(cb)
    }
  }

  snapshot(): ArrayBuffer {
    return this.buffer.slice(0, this.writeOffset)
  }

  private writeSentinel(offset: number): void {
    this.view.setUint16(offset + 14, 0)
  }

  private parseEntryAt(offset: number): LogEntry | null {
    if (offset + HEADER_SIZE > this.buffer.byteLength) return null

    const dataLen = this.view.getUint16(offset + 14)
    if (dataLen === 0) return null

    const ts = this.view.getBigUint64(offset)
    const levelNum = this.view.getUint8(offset + 8)
    const categoryNum = this.view.getUint8(offset + 9)
    const spanId = this.view.getUint32(offset + 10)

    let message = ''
    let context: Record<string, unknown> | undefined
    let source: string | undefined

    if (dataLen > 0) {
      const slice = this.u8.slice(offset + HEADER_SIZE, offset + HEADER_SIZE + dataLen)
      const decoded = decode(slice) as Record<string, unknown>
      message = String(decoded.message ?? '')
      if (decoded.context && typeof decoded.context === 'object') {
        context = decoded.context as Record<string, unknown>
      }
      if (decoded.source && typeof decoded.source === 'string') {
        source = decoded.source
      }
    }

    const entry: LogEntry = {
      timestamp: ts,
      level: LEVEL_MAP[levelNum] ?? 'info',
      category: categoryNum as LogCategory,
      spanId,
      message,
    }
    if (context) entry.context = context
    if (source) entry.source = source
    return entry
  }

  private captureCaller(): string | undefined {
    try {
      const stack = new Error().stack?.split('\n') ?? []
      for (const line of stack.slice(2)) {
        const trimmed = line.trim().replace(/^at\s+/, '')
        if (!trimmed.includes('ringBuffer') && !trimmed.includes('observability')) {
          return trimmed
        }
      }
      return undefined
    } catch {
      return undefined
    }
  }
}

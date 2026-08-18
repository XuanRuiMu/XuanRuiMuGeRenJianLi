import { encode, decode } from '@msgpack/msgpack'
import type { LogEntry, LogLevel } from './ringBuffer'
import type { Span } from './tracer'

const DEFAULT_DB_NAME = 'xrm-observability'
const BATCH_SIZE = 500

interface StoredLog {
  id: string
  timestamp: number
  level: string
  category: number
  spanId: number
  data: ArrayBuffer
  source?: string
}

interface StoredSpan {
  spanId: number
  traceId: number
  parentSpanId: number | null
  name: string
  startTime: number
  endTime?: number
  status: string
  metadata?: Record<string, unknown>
}

interface ReportedEntry {
  id: string
  timestamp: number
}

function logEntryToStored(entry: LogEntry): StoredLog {
  const id = (entry as LogEntry & { id?: string }).id ?? crypto.randomUUID()
  const data = encode({ message: entry.message, context: entry.context, source: entry.source })
  return {
    id,
    timestamp: Number(entry.timestamp),
    level: entry.level,
    category: entry.category as number,
    spanId: entry.spanId,
    data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    source: entry.source,
  }
}

function storedToLogEntry(stored: StoredLog): LogEntry & { id: string } {
  const decoded = decode(new Uint8Array(stored.data)) as {
    message: string
    context?: Record<string, unknown>
    source?: string
  }
  const entry: LogEntry & { id: string } = {
    id: stored.id,
    timestamp: BigInt(stored.timestamp),
    level: stored.level as LogLevel,
    category: stored.category as LogEntry['category'],
    spanId: stored.spanId,
    message: decoded.message,
  }
  if (decoded.context) entry.context = decoded.context
  if (stored.source) entry.source = stored.source
  if (decoded.source) entry.source = decoded.source
  return entry
}

function spanToStored(span: Span): StoredSpan {
  return {
    spanId: span.spanId,
    traceId: span.traceId,
    parentSpanId: span.parentSpanId,
    name: span.name,
    startTime: Number(span.startTime),
    endTime: span.endTime !== undefined ? Number(span.endTime) : undefined,
    status: span.status,
    metadata: span.metadata,
  }
}

function storedToSpan(stored: StoredSpan): Span {
  return {
    spanId: stored.spanId,
    traceId: stored.traceId,
    parentSpanId: stored.parentSpanId,
    name: stored.name,
    startTime: BigInt(stored.startTime),
    endTime: stored.endTime !== undefined ? BigInt(stored.endTime) : undefined,
    status: stored.status as Span['status'],
    metadata: stored.metadata,
  }
}

export class LogStore {
  private db: IDBDatabase | null = null
  private dbName: string
  private openPromise: Promise<void> | null = null

  constructor(dbName?: string) {
    this.dbName = dbName ?? DEFAULT_DB_NAME
  }

  open(): Promise<void> {
    if (this.openPromise) return this.openPromise
    this.openPromise = new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('logs')) {
          const logStore = db.createObjectStore('logs', { keyPath: 'id' })
          logStore.createIndex('timestamp', 'timestamp', { unique: false })
          logStore.createIndex('level', 'level', { unique: false })
          logStore.createIndex('spanId', 'spanId', { unique: false })
        }
        if (!db.objectStoreNames.contains('spans')) {
          const spanStore = db.createObjectStore('spans', { keyPath: 'spanId' })
          spanStore.createIndex('timestamp', 'startTime', { unique: false })
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'id' })
        }
      }
      req.onsuccess = () => {
        this.db = req.result
        resolve()
      }
      req.onerror = () => reject(req.error)
    })
    return this.openPromise
  }

  private async ensureOpen(): Promise<IDBDatabase> {
    if (this.db) return this.db
    await this.open()
    return this.db!
  }

  async writeEntries(entries: LogEntry[]): Promise<void> {
    const db = await this.ensureOpen()
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE)
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('logs', 'readwrite')
        const store = tx.objectStore('logs')
        for (const entry of batch) {
          store.put(logEntryToStored(entry))
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    }
  }

  async writeSpans(spans: Span[]): Promise<void> {
    const db = await this.ensureOpen()
    for (let i = 0; i < spans.length; i += BATCH_SIZE) {
      const batch = spans.slice(i, i + BATCH_SIZE)
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('spans', 'readwrite')
        const store = tx.objectStore('spans')
        for (const span of batch) {
          store.put(spanToStored(span))
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    }
  }

  async readEntries(limit: number = 100): Promise<LogEntry[]> {
    const db = await this.ensureOpen()
    return new Promise<LogEntry[]>((resolve, reject) => {
      const tx = db.transaction('logs', 'readonly')
      const store = tx.objectStore('logs')
      const index = store.index('timestamp')
      const req = index.openCursor(null, 'prev')
      const results: LogEntry[] = []
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor && results.length < limit) {
          results.push(storedToLogEntry(cursor.value as StoredLog))
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      req.onerror = () => reject(req.error)
    })
  }

  async readSpans(limit: number = 100): Promise<Span[]> {
    const db = await this.ensureOpen()
    return new Promise<Span[]>((resolve, reject) => {
      const tx = db.transaction('spans', 'readonly')
      const store = tx.objectStore('spans')
      const index = store.index('timestamp')
      const req = index.openCursor(null, 'prev')
      const results: Span[] = []
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor && results.length < limit) {
          results.push(storedToSpan(cursor.value as StoredSpan))
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      req.onerror = () => reject(req.error)
    })
  }

  async queryByLevel(level: LogLevel, limit: number = 100): Promise<LogEntry[]> {
    const db = await this.ensureOpen()
    return new Promise<LogEntry[]>((resolve, reject) => {
      const tx = db.transaction('logs', 'readonly')
      const store = tx.objectStore('logs')
      const index = store.index('level')
      const req = index.getAll(level, limit)
      req.onsuccess = () => {
        const stored = (req.result as StoredLog[]).sort((a, b) => b.timestamp - a.timestamp)
        resolve(stored.map(storedToLogEntry))
      }
      req.onerror = () => reject(req.error)
    })
  }

  async queryBySpanId(spanId: number): Promise<LogEntry[]> {
    const db = await this.ensureOpen()
    return new Promise<LogEntry[]>((resolve, reject) => {
      const tx = db.transaction('logs', 'readonly')
      const store = tx.objectStore('logs')
      const index = store.index('spanId')
      const req = index.getAll(spanId)
      req.onsuccess = () => {
        const stored = (req.result as StoredLog[]).sort((a, b) => b.timestamp - a.timestamp)
        resolve(stored.map(storedToLogEntry))
      }
      req.onerror = () => reject(req.error)
    })
  }

  async getUnreportedEntries(): Promise<LogEntry[]> {
    const db = await this.ensureOpen()
    const tx = db.transaction(['logs', 'meta'], 'readonly')
    const logStore = tx.objectStore('logs')
    const metaStore = tx.objectStore('meta')

    const allLogsReq = logStore.getAll()
    const reportedReq = metaStore.getAll()

    const [allLogs, reported] = await Promise.all([
      new Promise<StoredLog[]>((resolve, reject) => {
        allLogsReq.onsuccess = () => resolve(allLogsReq.result as StoredLog[])
        allLogsReq.onerror = () => reject(allLogsReq.error)
      }),
      new Promise<ReportedEntry[]>((resolve, reject) => {
        reportedReq.onsuccess = () => resolve(reportedReq.result as ReportedEntry[])
        reportedReq.onerror = () => reject(reportedReq.error)
      }),
    ])

    const reportedSet = new Set(reported.map((r) => r.id))
    const unreported = allLogs.filter((s) => !reportedSet.has(s.id)).sort((a, b) => a.timestamp - b.timestamp)
    return unreported.map(storedToLogEntry)
  }

  async markReported(entryIds: string[]): Promise<void> {
    if (entryIds.length === 0) return
    const db = await this.ensureOpen()
    const now = Date.now()
    for (let i = 0; i < entryIds.length; i += BATCH_SIZE) {
      const batch = entryIds.slice(i, i + BATCH_SIZE)
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('meta', 'readwrite')
        const store = tx.objectStore('meta')
        for (const id of batch) {
          store.put({ id, timestamp: now } satisfies ReportedEntry)
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    }
  }

  async getStats(): Promise<{ entryCount: number; spanCount: number; dbSize: number }> {
    const db = await this.ensureOpen()
    const tx = db.transaction(['logs', 'spans', 'meta'], 'readonly')
    const logStore = tx.objectStore('logs')
    const spanStore = tx.objectStore('spans')
    const metaStore = tx.objectStore('meta')

    const [entryCount, spanCount, metaCount] = await Promise.all([
      new Promise<number>((resolve, reject) => {
        const req = logStore.count()
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
      new Promise<number>((resolve, reject) => {
        const req = spanStore.count()
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
      new Promise<number>((resolve, reject) => {
        const req = metaStore.count()
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
    ])

    const estimatePerEntry = 256
    const dbSize = (entryCount + spanCount + metaCount) * estimatePerEntry
    return { entryCount, spanCount, dbSize }
  }

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.openPromise = null
    }
  }
}

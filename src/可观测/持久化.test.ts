import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 环形缓冲, 日志分类 } from './环形缓冲'
import { 追踪器 } from './追踪器'
import { 日志存储 } from './持久化'
import { WebSocket传输 } from './WebSocket传输'
import { 信标传输 } from './信标传输'

if (typeof crypto.randomUUID !== 'function') {
  crypto.randomUUID = () =>
    `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    }) as `${string}-${string}-${string}-${string}-${string}`
}

describe('LogStore', () => {
  let 仓库: 日志存储

  beforeEach(async () => {
    仓库 = new 日志存储('test-observability')
    await 仓库.open()
  })

  afterEach(() => {
    仓库.关闭()
    const 请求 = indexedDB.deleteDatabase('test-observability')
    请求.onsuccess = () => {}
  })

  it('opens database', async () => {
    const s = new 日志存储('test-open-db')
    await s.open()
    const 统计 = await s.获取统计()
    expect(统计).toHaveProperty('entryCount')
    expect(统计).toHaveProperty('spanCount')
    expect(统计).toHaveProperty('dbSize')
    s.关闭()
    indexedDB.deleteDatabase('test-open-db')
  })

  it('writes and reads entries', async () => {
    const 环 = new 环形缓冲(4096)
    环.写入('info', 日志分类.运行时分类, 'hello persistence')
    环.写入('error', 日志分类.网络分类, 'network error', { code: 500 })
    const 条目表 = 环.读取()
    expect(条目表).toHaveLength(2)

    await 仓库.写入条目(条目表)
    const 读取 = await 仓库.读取条目(10)
    expect(读取).toHaveLength(2)
    expect(读取.some((e) => e.message === 'hello persistence')).toBe(true)
    expect(读取.some((e) => e.message === 'network error')).toBe(true)
  })

  it('writes and reads spans', async () => {
    const 环 = new 环形缓冲(4096)
    const 追踪器实例 = new 追踪器(环)
    const sid1 = 追踪器实例.开始跨度('span-a')
    const sid2 = 追踪器实例.开始跨度('span-b', sid1)
    追踪器实例.结束跨度(sid2)
    追踪器实例.结束跨度(sid1)
    const 跨度表 = 追踪器实例.获取跨度表()
    expect(跨度表).toHaveLength(2)

    await 仓库.写入跨度(跨度表)
    const 读取 = await 仓库.读取跨度(10)
    expect(读取).toHaveLength(2)
    expect(读取.some((s) => s.name === 'span-a')).toBe(true)
    expect(读取.some((s) => s.name === 'span-b')).toBe(true)
  })

  it('queries by level', async () => {
    const 环 = new 环形缓冲(4096)
    环.写入('info', 日志分类.运行时分类, 'info msg')
    环.写入('error', 日志分类.运行时分类, 'error msg')
    环.写入('warn', 日志分类.运行时分类, 'warn msg')
    环.写入('error', 日志分类.运行时分类, 'another error')
    const 条目表 = 环.读取()
    await 仓库.写入条目(条目表)

    const 错误表 = await 仓库.按级别查询('error')
    expect(错误表).toHaveLength(2)

    const 信息表 = await 仓库.按级别查询('info')
    expect(信息表).toHaveLength(1)
    expect(信息表[0].message).toBe('info msg')
  })

  it('queries by spanId', async () => {
    const 环 = new 环形缓冲(4096)
    const 追踪器实例 = new 追踪器(环)
    const 会话编号 = 追踪器实例.开始跨度('test-span')
    环.写入('info', 日志分类.运行时分类, 'span log', { spanId: 会话编号 }, 会话编号)
    const 条目表 = 环.读取()
    await 仓库.写入条目(条目表)

    const 已找到 = await 仓库.按跨度编号查询(会话编号)
    expect(已找到.length).toBeGreaterThanOrEqual(1)
    已找到.forEach((e) => expect(e.spanId).toBe(会话编号))
  })

  it('marks and retrieves unreported entries', async () => {
    const 环 = new 环形缓冲(4096)
    环.写入('info', 日志分类.运行时分类, 'reported-msg')
    环.写入('info', 日志分类.运行时分类, 'unreported-msg')
    const 条目表 = 环.读取()
    expect(条目表).toHaveLength(2)
    await 仓库.写入条目(条目表)

    const 之前 = await 仓库.获取未上报条目()
    expect(之前).toHaveLength(2)

    const 编号表 = 之前.map((e) => (e as unknown as { id: string }).id)
    expect(编号表).toHaveLength(2)

    await 仓库.标记已上报([编号表[0]])
    await new Promise((r) => setTimeout(r, 10))

    const 之后 = await 仓库.获取未上报条目()
    expect(之后).toHaveLength(1)
  })

  it('getStats returns counts', async () => {
    const 环 = new 环形缓冲(4096)
    环.写入('info', 日志分类.运行时分类, 'stat entry')
    const 条目表 = 环.读取()
    await 仓库.写入条目(条目表)

    const 统计 = await 仓库.获取统计()
    expect(统计.entryCount).toBeGreaterThanOrEqual(1)
    expect(统计.spanCount).toBeGreaterThanOrEqual(0)
    expect(统计.dbSize).toBeGreaterThan(0)
  })
})

describe('WsTransport', () => {
  let 环: 环形缓冲
  let 传输: WebSocket传输
  let 模拟网络套接字实例!: {
    onopen: (() => void) | null
    onclose: ((e: Event) => void) | null
    onerror: (() => void) | null
    send: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
    readyState: number
  }

  class 模拟网络套接字 {
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3
    onopen: (() => void) | null = null
    onclose: ((e: Event) => void) | null = null
    onerror: (() => void) | null = null
    send = vi.fn()
    close = vi.fn()
    readyState = 1
    binaryType = ''
    static 捕获(实例: 模拟网络套接字): void {
      模拟网络套接字实例 = 实例
    }
    constructor() {
      模拟网络套接字.捕获(this)
    }
  }

  beforeEach(() => {
    环 = new 环形缓冲(4096)

    vi.stubGlobal('location', { protocol: 'http:', hostname: 'localhost', port: '9999' })
    vi.stubGlobal('WebSocket', 模拟网络套接字)

    传输 = new WebSocket传输(环)
  })

  afterEach(() => {
    传输.断开()
    vi.unstubAllGlobals()
  })

  it('connects and disconnects', async () => {
    const 连接承诺 = 传输.connect()
    模拟网络套接字实例.onopen!()
    await 连接承诺
    expect(传输.已连接).toBe(true)

    传输.断开()
    expect(传输.已连接).toBe(false)
  })

  it('sends log entries when subscribed', async () => {
    const 连接承诺 = 传输.connect()
    模拟网络套接字实例.onopen!()
    await 连接承诺

    环.写入('info', 日志分类.运行时分类, 'ws test msg')
    expect(模拟网络套接字实例.send).toHaveBeenCalled()
  })
})

describe('BeaconTransport', () => {
  let 环: 环形缓冲
  let 仓库: 日志存储
  let 传输: 信标传输
  let 信标发送函数: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    环 = new 环形缓冲(4096)
    仓库 = new 日志存储('test-beacon-db')
    await 仓库.open()
    信标发送函数 = vi.fn(() => true)
    vi.stubGlobal('navigator', { sendBeacon: 信标发送函数 })
    传输 = new 信标传输(环, 仓库, '/测试/logs')
  })

  afterEach(async () => {
    传输.停止()
    仓库.关闭()
    vi.unstubAllGlobals()
    indexedDB.deleteDatabase('test-beacon-db')
  })

  it('flushes unreported entries', async () => {
    环.写入('info', 日志分类.运行时分类, 'beacon test')
    const 条目表 = 环.读取()
    await 仓库.写入条目(条目表)

    await 传输.刷新()
    expect(信标发送函数).toHaveBeenCalled()
    const [url, blob] = 信标发送函数.mock.calls[0]
    expect(url).toBe('/测试/logs')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/msgpack')
  })
})

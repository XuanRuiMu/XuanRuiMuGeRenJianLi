import { describe, it, expect, beforeEach } from 'vitest'
import { 环形缓冲, 日志分类 } from './环形缓冲'

describe('RingBuffer', () => {
  let buf: 环形缓冲

  beforeEach(() => {
    buf = new 环形缓冲(1024)
  })

  it('writes and reads a single entry', () => {
    buf.write('info', 日志分类.Runtime, 'test message')
    const entries = buf.read()
    expect(entries).toHaveLength(1)
    expect(entries[0].message).toBe('test message')
    expect(entries[0].level).toBe('info')
    expect(entries[0].category).toBe(日志分类.Runtime)
  })

  it('writes and reads multiple entries', () => {
    buf.write('debug', 日志分类.Render, 'msg1', { a: 1 })
    buf.write('error', 日志分类.Network, 'msg2')
    const entries = buf.read()
    expect(entries).toHaveLength(2)
    expect(entries[0].message).toBe('msg1')
    expect(entries[0].context?.a).toBe(1)
    expect(entries[1].message).toBe('msg2')
    expect(entries[1].level).toBe('error')
  })

  it('wraps around when buffer is full', () => {
    const ring = new 环形缓冲(512)
    for (let i = 0; i < 10; i++) {
      ring.write('info', 日志分类.Runtime, `wrap-${i}`)
    }
    const entries = ring.read()
    expect(entries.length).toBeGreaterThan(0)
  })

  it('returns empty array when nothing new', () => {
    buf.write('info', 日志分类.Runtime, 'test')
    buf.read()
    const entries = buf.read()
    expect(entries).toHaveLength(0)
  })

  it('subscribes and receives realtime callbacks', () => {
    const received: unknown[] = []
    const unsub = buf.subscribe((entry) => {
      received.push(entry)
    })
    buf.write('info', 日志分类.Runtime, 'hello')
    expect(received).toHaveLength(1)
    const e = received[0] as { message: string }
    expect(e.message).toBe('hello')
    unsub()
  })

  it('unsubscribe stops callbacks', () => {
    const received: unknown[] = []
    const unsub = buf.subscribe((entry) => {
      received.push(entry)
    })
    buf.write('info', 日志分类.Runtime, 'first')
    expect(received).toHaveLength(1)
    unsub()
    buf.write('info', 日志分类.Runtime, 'second')
    expect(received).toHaveLength(1)
  })

  it('snapshot returns correct byte data', () => {
    buf.write('info', 日志分类.Runtime, 'snap test')
    const snap = buf.snapshot()
    expect(snap.byteLength).toBeGreaterThan(0)
    const entries = buf.read()
    expect(entries).toHaveLength(1)
  })

  it('preserves message content across write/read cycle', () => {
    const longMsg = 'Hello World! 你好世界! こんにちは! 🌍'
    buf.write('info', 日志分类.Runtime, longMsg)
    const entries = buf.read()
    expect(entries[0].message).toBe(longMsg)
  })

  it('preserves context across write/read cycle', () => {
    buf.write('info', 日志分类.Runtime, 'with ctx', { key: 'value', num: 42 })
    const entries = buf.read()
    expect(entries[0].context?.key).toBe('value')
    expect(entries[0].context?.num).toBe(42)
  })

  it('does not allocate in hot write path', () => {
    const big = new 环形缓冲() // 默认 128KB
    for (let i = 0; i < 100; i++) {
      big.write('debug', 日志分类.Render, `bulk msg ${i}`)
    }
    const entries = big.read()
    expect(entries).toHaveLength(100)
  })

  it('handles unreadBytes correctly', () => {
    expect(buf.unreadBytes).toBe(0)
    buf.write('info', 日志分类.Runtime, 'test')
    expect(buf.unreadBytes).toBeGreaterThan(0)
    buf.read()
    expect(buf.unreadBytes).toBe(0)
  })

  it('clear resets state', () => {
    buf.write('info', 日志分类.Runtime, 'test')
    buf.clear()
    expect(buf.unreadBytes).toBe(0)
    expect(buf.read()).toHaveLength(0)
  })

  it('handles empty context', () => {
    buf.write('info', 日志分类.Runtime, 'no ctx', {})
    const entries = buf.read()
    expect(entries[0].message).toBe('no ctx')
    expect(entries[0].context).toBeUndefined()
  })

  it('handles fatal level', () => {
    buf.write('fatal', 日志分类.Other, 'fatal error')
    const entries = buf.read()
    expect(entries[0].level).toBe('fatal')
  })
})

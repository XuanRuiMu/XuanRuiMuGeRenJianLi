import { describe, it, expect, beforeEach } from 'vitest'
import { RingBuffer, LogCategory } from './ringBuffer'

describe('RingBuffer', () => {
  let buf: RingBuffer

  beforeEach(() => {
    buf = new RingBuffer(1024)
  })

  it('writes and reads a single entry', () => {
    buf.write('info', LogCategory.Runtime, 'test message')
    const entries = buf.read()
    expect(entries).toHaveLength(1)
    expect(entries[0].message).toBe('test message')
    expect(entries[0].level).toBe('info')
    expect(entries[0].category).toBe(LogCategory.Runtime)
  })

  it('writes and reads multiple entries', () => {
    buf.write('debug', LogCategory.Render, 'msg1', { a: 1 })
    buf.write('error', LogCategory.Network, 'msg2')
    const entries = buf.read()
    expect(entries).toHaveLength(2)
    expect(entries[0].message).toBe('msg1')
    expect(entries[0].context?.a).toBe(1)
    expect(entries[1].message).toBe('msg2')
    expect(entries[1].level).toBe('error')
  })

  it('wraps around when buffer is full', () => {
    const ring = new RingBuffer(512)
    for (let i = 0; i < 10; i++) {
      ring.write('info', LogCategory.Runtime, `wrap-${i}`)
    }
    const entries = ring.read()
    expect(entries.length).toBeGreaterThan(0)
  })

  it('returns empty array when nothing new', () => {
    buf.write('info', LogCategory.Runtime, 'test')
    buf.read()
    const entries = buf.read()
    expect(entries).toHaveLength(0)
  })

  it('subscribes and receives realtime callbacks', () => {
    const received: unknown[] = []
    const unsub = buf.subscribe((entry) => {
      received.push(entry)
    })
    buf.write('info', LogCategory.Runtime, 'hello')
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
    buf.write('info', LogCategory.Runtime, 'first')
    expect(received).toHaveLength(1)
    unsub()
    buf.write('info', LogCategory.Runtime, 'second')
    expect(received).toHaveLength(1)
  })

  it('snapshot returns correct byte data', () => {
    buf.write('info', LogCategory.Runtime, 'snap test')
    const snap = buf.snapshot()
    expect(snap.byteLength).toBeGreaterThan(0)
    const entries = buf.read()
    expect(entries).toHaveLength(1)
  })

  it('preserves message content across write/read cycle', () => {
    const longMsg = 'Hello World! 你好世界! こんにちは! 🌍'
    buf.write('info', LogCategory.Runtime, longMsg)
    const entries = buf.read()
    expect(entries[0].message).toBe(longMsg)
  })

  it('preserves context across write/read cycle', () => {
    buf.write('info', LogCategory.Runtime, 'with ctx', { key: 'value', num: 42 })
    const entries = buf.read()
    expect(entries[0].context?.key).toBe('value')
    expect(entries[0].context?.num).toBe(42)
  })

  it('does not allocate in hot write path', () => {
    const big = new RingBuffer() // 默认 128KB
    for (let i = 0; i < 100; i++) {
      big.write('debug', LogCategory.Render, `bulk msg ${i}`)
    }
    const entries = big.read()
    expect(entries).toHaveLength(100)
  })

  it('handles unreadBytes correctly', () => {
    expect(buf.unreadBytes).toBe(0)
    buf.write('info', LogCategory.Runtime, 'test')
    expect(buf.unreadBytes).toBeGreaterThan(0)
    buf.read()
    expect(buf.unreadBytes).toBe(0)
  })

  it('clear resets state', () => {
    buf.write('info', LogCategory.Runtime, 'test')
    buf.clear()
    expect(buf.unreadBytes).toBe(0)
    expect(buf.read()).toHaveLength(0)
  })

  it('handles empty context', () => {
    buf.write('info', LogCategory.Runtime, 'no ctx', {})
    const entries = buf.read()
    expect(entries[0].message).toBe('no ctx')
    expect(entries[0].context).toBeUndefined()
  })

  it('handles fatal level', () => {
    buf.write('fatal', LogCategory.Other, 'fatal error')
    const entries = buf.read()
    expect(entries[0].level).toBe('fatal')
  })
})

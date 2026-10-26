import { describe, it, expect, beforeEach } from 'vitest'
import { 环形缓冲, 日志分类 } from './环形缓冲'

describe('RingBuffer', () => {
  let 缓冲区: 环形缓冲

  beforeEach(() => {
    缓冲区 = new 环形缓冲(1024)
  })

  it('writes and reads a single entry', () => {
    缓冲区.写入('info', 日志分类.运行时分类, 'test message')
    const 条目表 = 缓冲区.读取()
    expect(条目表).toHaveLength(1)
    expect(条目表[0].message).toBe('test message')
    expect(条目表[0].level).toBe('info')
    expect(条目表[0].category).toBe(日志分类.运行时分类)
  })

  it('writes and reads multiple entries', () => {
    缓冲区.写入('debug', 日志分类.渲染分类, 'msg1', { a: 1 })
    缓冲区.写入('error', 日志分类.网络分类, 'msg2')
    const 条目表 = 缓冲区.读取()
    expect(条目表).toHaveLength(2)
    expect(条目表[0].message).toBe('msg1')
    expect(条目表[0].context?.a).toBe(1)
    expect(条目表[1].message).toBe('msg2')
    expect(条目表[1].level).toBe('error')
  })

  it('wraps around when buffer is full', () => {
    const 环 = new 环形缓冲(512)
    for (let i = 0; i < 10; i++) {
      环.写入('info', 日志分类.运行时分类, `wrap-${i}`)
    }
    const 条目表 = 环.读取()
    expect(条目表.length).toBeGreaterThan(0)
  })

  it('returns empty array when nothing new', () => {
    缓冲区.写入('info', 日志分类.运行时分类, 'test')
    缓冲区.读取()
    const 条目表 = 缓冲区.读取()
    expect(条目表).toHaveLength(0)
  })

  it('subscribes and receives realtime callbacks', () => {
    const 已接收: unknown[] = []
    const 取消订阅 = 缓冲区.订阅((条目) => {
      已接收.push(条目)
    })
    缓冲区.写入('info', 日志分类.运行时分类, 'hello')
    expect(已接收).toHaveLength(1)
    const e = 已接收[0] as { message: string }
    expect(e.message).toBe('hello')
    取消订阅()
  })

  it('unsubscribe stops callbacks', () => {
    const 已接收: unknown[] = []
    const 取消订阅 = 缓冲区.订阅((条目) => {
      已接收.push(条目)
    })
    缓冲区.写入('info', 日志分类.运行时分类, 'first')
    expect(已接收).toHaveLength(1)
    取消订阅()
    缓冲区.写入('info', 日志分类.运行时分类, 'second')
    expect(已接收).toHaveLength(1)
  })

  it('snapshot returns correct byte data', () => {
    缓冲区.写入('info', 日志分类.运行时分类, 'snap test')
    const 快照 = 缓冲区.快照数据()
    expect(快照.byteLength).toBeGreaterThan(0)
    const 条目表 = 缓冲区.读取()
    expect(条目表).toHaveLength(1)
  })

  it('preserves message content across write/read cycle', () => {
    const 长消息 = 'Hello World! 你好世界! こんにちは! 🌍'
    缓冲区.写入('info', 日志分类.运行时分类, 长消息)
    const 条目表 = 缓冲区.读取()
    expect(条目表[0].message).toBe(长消息)
  })

  it('preserves context across write/read cycle', () => {
    缓冲区.写入('info', 日志分类.运行时分类, 'with ctx', { key: 'value', num: 42 })
    const 条目表 = 缓冲区.读取()
    expect(条目表[0].context?.key).toBe('value')
    expect(条目表[0].context?.num).toBe(42)
  })

  it('does not allocate in hot write path', () => {
    const 大 = new 环形缓冲()
    for (let i = 0; i < 100; i++) {
      大.写入('debug', 日志分类.渲染分类, `bulk msg ${i}`)
    }
    const 条目表 = 大.读取()
    expect(条目表).toHaveLength(100)
  })

  it('handles unreadBytes correctly', () => {
    expect(缓冲区.未读字节).toBe(0)
    缓冲区.写入('info', 日志分类.运行时分类, 'test')
    expect(缓冲区.未读字节).toBeGreaterThan(0)
    缓冲区.读取()
    expect(缓冲区.未读字节).toBe(0)
  })

  it('clear resets state', () => {
    缓冲区.写入('info', 日志分类.运行时分类, 'test')
    缓冲区.清空()
    expect(缓冲区.未读字节).toBe(0)
    expect(缓冲区.读取()).toHaveLength(0)
  })

  it('handles empty context', () => {
    缓冲区.写入('info', 日志分类.运行时分类, 'no ctx', {})
    const 条目表 = 缓冲区.读取()
    expect(条目表[0].message).toBe('no ctx')
    expect(条目表[0].context).toBeUndefined()
  })

  it('handles fatal level', () => {
    缓冲区.写入('fatal', 日志分类.其他分类, 'fatal error')
    const 条目表 = 缓冲区.读取()
    expect(条目表[0].level).toBe('fatal')
  })
})

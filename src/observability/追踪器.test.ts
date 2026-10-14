import { describe, it, expect, beforeEach } from 'vitest'
import { 环形缓冲 } from './环形缓冲'
import { 追踪器, withSpan } from './追踪器'

describe('Tracer', () => {
  let buf: 环形缓冲
  let 追踪器实例: 追踪器

  beforeEach(() => {
    buf = new 环形缓冲(4096)
    追踪器实例 = new 追踪器(buf)
  })

  it('creates a root span', () => {
    const spanId = 追踪器实例.startSpan('root')
    expect(spanId).toBe(1)
    const span = 追踪器实例.getCurrentSpan()
    expect(span).not.toBeNull()
    expect(span!.spanId).toBe(1)
    expect(span!.traceId).toBe(1)
    expect(span!.parentSpanId).toBeNull()
    expect(span!.name).toBe('root')
    expect(span!.startTime).toBeTypeOf('bigint')
    expect(span!.status).toBe('unset')
  })

  it('creates nested spans', () => {
    const rootId = 追踪器实例.startSpan('root')
    const childId = 追踪器实例.startSpan('child', rootId)
    expect(childId).toBe(2)
    const child = 追踪器实例.getCurrentSpan()
    expect(child!.spanId).toBe(2)
    expect(child!.parentSpanId).toBe(1)
    expect(child!.traceId).toBe(1)
  })

  it('auto-parents to current active span', () => {
    追踪器实例.startSpan('root')
    const childId = 追踪器实例.startSpan('auto-child')
    expect(childId).toBe(2)
    const child = 追踪器实例.getCurrentSpan()
    expect(child!.parentSpanId).toBe(1)
    expect(child!.traceId).toBe(1)
  })

  it('ends span with ok status', () => {
    const spanId = 追踪器实例.startSpan('test')
    追踪器实例.endSpan(spanId, 'ok')
    const span = 追踪器实例.getCurrentSpan()
    expect(span).toBeNull()
    const all = 追踪器实例.getSpans()
    const ended = all.find((s) => s.spanId === spanId)
    expect(ended).not.toBeUndefined()
    expect(ended!.status).toBe('ok')
    expect(ended!.endTime).toBeTypeOf('bigint')
    expect(Number(ended!.endTime)).toBeGreaterThanOrEqual(Number(ended!.startTime))
  })

  it('ends span with error status', () => {
    const spanId = 追踪器实例.startSpan('fail')
    追踪器实例.endSpan(spanId, 'error')
    const all = 追踪器实例.getSpans()
    const ended = all.find((s) => s.spanId === spanId)
    expect(ended!.status).toBe('error')
    expect(ended!.endTime).toBeTypeOf('bigint')
  })

  it('getCurrentSpan returns innermost active', () => {
    const r1 = 追踪器实例.startSpan('outer')
    追踪器实例.startSpan('inner')
    const current = 追踪器实例.getCurrentSpan()
    expect(current!.name).toBe('inner')
    expect(current!.parentSpanId).toBe(r1)
  })

  it('withSpan wraps async function', async () => {
    const result = await withSpan(追踪器实例, 'async-task', async () => {
      return 42
    })
    expect(result).toBe(42)
    const all = 追踪器实例.getSpans()
    const span = all.find((s) => s.name === 'async-task')
    expect(span).not.toBeUndefined()
    expect(span!.status).toBe('ok')
    expect(span!.endTime).toBeTypeOf('bigint')
  })

  it('withSpan marks error on exception', async () => {
    await expect(
      withSpan(追踪器实例, 'bad-task', async () => {
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')
    const all = 追踪器实例.getSpans()
    const span = all.find((s) => s.name === 'bad-task')
    expect(span).not.toBeUndefined()
    expect(span!.status).toBe('error')
    expect(span!.endTime).toBeTypeOf('bigint')
  })

  it('prune removes old completed spans', () => {
    const ids: number[] = []
    for (let i = 0; i < 150; i++) {
      ids.push(追踪器实例.startSpan(`span-${i}`))
    }
    for (const id of ids) {
      追踪器实例.endSpan(id)
    }
    expect(追踪器实例.getSpans().length).toBe(150)
    追踪器实例.prune()
    expect(追踪器实例.getSpans().length).toBe(100)
  })

  it('writes start/end events to ringBuffer', () => {
    const sid = 追踪器实例.startSpan('log-test')
    追踪器实例.endSpan(sid)
    const entries = buf.read()
    const msgs = entries.map((e) => e.message)
    expect(msgs).toContain('[span:start] log-test')
    expect(msgs).toContain('[span:end] log-test')
  })

  it('getSpans returns all spans', () => {
    追踪器实例.startSpan('a')
    追踪器实例.startSpan('b')
    expect(追踪器实例.getSpans().length).toBe(2)
    追踪器实例.endSpan(2)
    const all = 追踪器实例.getSpans()
    expect(all.length).toBe(2)
    expect(all.filter((s) => s.status === 'unset').length).toBe(1)
    expect(all.filter((s) => s.status === 'ok').length).toBe(1)
  })
})

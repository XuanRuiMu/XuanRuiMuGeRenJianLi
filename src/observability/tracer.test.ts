import { describe, it, expect, beforeEach } from 'vitest'
import { RingBuffer } from './ringBuffer'
import { Tracer, withSpan } from './tracer'

describe('Tracer', () => {
  let buf: RingBuffer
  let tracer: Tracer

  beforeEach(() => {
    buf = new RingBuffer(4096)
    tracer = new Tracer(buf)
  })

  it('creates a root span', () => {
    const spanId = tracer.startSpan('root')
    expect(spanId).toBe(1)
    const span = tracer.getCurrentSpan()
    expect(span).not.toBeNull()
    expect(span!.spanId).toBe(1)
    expect(span!.traceId).toBe(1)
    expect(span!.parentSpanId).toBeNull()
    expect(span!.name).toBe('root')
    expect(span!.startTime).toBeTypeOf('bigint')
    expect(span!.status).toBe('unset')
  })

  it('creates nested spans', () => {
    const rootId = tracer.startSpan('root')
    const childId = tracer.startSpan('child', rootId)
    expect(childId).toBe(2)
    const child = tracer.getCurrentSpan()
    expect(child!.spanId).toBe(2)
    expect(child!.parentSpanId).toBe(1)
    expect(child!.traceId).toBe(1)
  })

  it('auto-parents to current active span', () => {
    tracer.startSpan('root')
    const childId = tracer.startSpan('auto-child')
    expect(childId).toBe(2)
    const child = tracer.getCurrentSpan()
    expect(child!.parentSpanId).toBe(1)
    expect(child!.traceId).toBe(1)
  })

  it('ends span with ok status', () => {
    const spanId = tracer.startSpan('test')
    tracer.endSpan(spanId, 'ok')
    const span = tracer.getCurrentSpan()
    expect(span).toBeNull()
    const all = tracer.getSpans()
    const ended = all.find((s) => s.spanId === spanId)
    expect(ended).not.toBeUndefined()
    expect(ended!.status).toBe('ok')
    expect(ended!.endTime).toBeTypeOf('bigint')
    expect(Number(ended!.endTime)).toBeGreaterThanOrEqual(Number(ended!.startTime))
  })

  it('ends span with error status', () => {
    const spanId = tracer.startSpan('fail')
    tracer.endSpan(spanId, 'error')
    const all = tracer.getSpans()
    const ended = all.find((s) => s.spanId === spanId)
    expect(ended!.status).toBe('error')
    expect(ended!.endTime).toBeTypeOf('bigint')
  })

  it('getCurrentSpan returns innermost active', () => {
    const r1 = tracer.startSpan('outer')
    tracer.startSpan('inner')
    const current = tracer.getCurrentSpan()
    expect(current!.name).toBe('inner')
    expect(current!.parentSpanId).toBe(r1)
  })

  it('withSpan wraps async function', async () => {
    const result = await withSpan(tracer, 'async-task', async () => {
      return 42
    })
    expect(result).toBe(42)
    const all = tracer.getSpans()
    const span = all.find((s) => s.name === 'async-task')
    expect(span).not.toBeUndefined()
    expect(span!.status).toBe('ok')
    expect(span!.endTime).toBeTypeOf('bigint')
  })

  it('withSpan marks error on exception', async () => {
    await expect(
      withSpan(tracer, 'bad-task', async () => {
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')
    const all = tracer.getSpans()
    const span = all.find((s) => s.name === 'bad-task')
    expect(span).not.toBeUndefined()
    expect(span!.status).toBe('error')
    expect(span!.endTime).toBeTypeOf('bigint')
  })

  it('prune removes old completed spans', () => {
    const ids: number[] = []
    for (let i = 0; i < 150; i++) {
      ids.push(tracer.startSpan(`span-${i}`))
    }
    for (const id of ids) {
      tracer.endSpan(id)
    }
    expect(tracer.getSpans().length).toBe(150)
    tracer.prune()
    expect(tracer.getSpans().length).toBe(100)
  })

  it('writes start/end events to ringBuffer', () => {
    const sid = tracer.startSpan('log-test')
    tracer.endSpan(sid)
    const entries = buf.read()
    const msgs = entries.map((e) => e.message)
    expect(msgs).toContain('[span:start] log-test')
    expect(msgs).toContain('[span:end] log-test')
  })

  it('getSpans returns all spans', () => {
    tracer.startSpan('a')
    tracer.startSpan('b')
    expect(tracer.getSpans().length).toBe(2)
    tracer.endSpan(2)
    const all = tracer.getSpans()
    expect(all.length).toBe(2)
    expect(all.filter((s) => s.status === 'unset').length).toBe(1)
    expect(all.filter((s) => s.status === 'ok').length).toBe(1)
  })
})

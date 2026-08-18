import type { RingBuffer } from './ringBuffer'
import { LogCategory } from './ringBuffer'

export interface Span {
  spanId: number
  traceId: number
  parentSpanId: number | null
  name: string
  startTime: bigint
  endTime?: bigint
  status: 'ok' | 'error' | 'unset'
  metadata?: Record<string, unknown>
}

export class Tracer {
  private nextSpanId = 1
  private activeSpans = new Map<number, Span>()
  private completedSpans: Span[] = []
  private perfStartTimes = new Map<number, number>()

  constructor(private ringBuffer: RingBuffer) {}

  startSpan(name: string, parentSpanId?: number, metadata?: Record<string, unknown>): number {
    const spanId = this.nextSpanId++
    let parentId = parentSpanId ?? null

    if (parentId === null && this.activeSpans.size > 0) {
      let innermost: Span | null = null
      let maxId = -1
      for (const span of this.activeSpans.values()) {
        if (span.spanId > maxId) {
          maxId = span.spanId
          innermost = span
        }
      }
      if (innermost) parentId = innermost.spanId
    }

    const traceId = parentId === null ? spanId : this.resolveTraceId(parentId)
    const startTime = BigInt(Date.now())

    const span: Span = { spanId, traceId, parentSpanId: parentId, name, startTime, status: 'unset', metadata }
    this.activeSpans.set(spanId, span)
    this.perfStartTimes.set(spanId, performance.now())

    this.ringBuffer.write('info', LogCategory.Runtime, `[span:start] ${name}`, { spanId }, spanId)
    return spanId
  }

  endSpan(spanId: number, status?: 'ok' | 'error', finalMetadata?: Record<string, unknown>): void {
    const span = this.activeSpans.get(spanId)
    if (!span) return

    const endTime = BigInt(Date.now())
    span.endTime = endTime
    span.status = status ?? 'ok'

    if (finalMetadata) {
      span.metadata = { ...span.metadata, ...finalMetadata }
    }

    const perfStart = this.perfStartTimes.get(spanId) ?? 0
    const duration = Math.round((performance.now() - perfStart) * 1000)

    this.activeSpans.delete(spanId)
    this.completedSpans.push(span)
    this.perfStartTimes.delete(spanId)

    this.ringBuffer.write('info', LogCategory.Runtime, `[span:end] ${span.name}`, { spanId, duration }, spanId)
  }

  getCurrentSpan(): Span | null {
    if (this.activeSpans.size === 0) return null
    let innermost: Span | null = null
    let maxId = -1
    for (const span of this.activeSpans.values()) {
      if (span.spanId > maxId) {
        maxId = span.spanId
        innermost = span
      }
    }
    return innermost
  }

  getSpans(): Span[] {
    return [...this.activeSpans.values(), ...this.completedSpans]
  }

  prune(): void {
    if (this.completedSpans.length > 100) {
      this.completedSpans = this.completedSpans.slice(-100)
    }
  }

  private resolveTraceId(spanId: number): number {
    const span = this.activeSpans.get(spanId) ?? this.completedSpans.find((s) => s.spanId === spanId)
    if (!span) return spanId
    if (span.parentSpanId === null) return span.spanId
    const parent =
      this.activeSpans.get(span.parentSpanId) ?? this.completedSpans.find((s) => s.spanId === span.parentSpanId)
    if (parent) return parent.traceId
    return this.resolveTraceId(span.parentSpanId)
  }
}

export function withSpan<T>(
  tracer: Tracer,
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const spanId = tracer.startSpan(name, undefined, metadata)
  return fn()
    .then((result) => {
      tracer.endSpan(spanId, 'ok')
      return result
    })
    .catch((err) => {
      tracer.endSpan(spanId, 'error')
      throw err
    })
}

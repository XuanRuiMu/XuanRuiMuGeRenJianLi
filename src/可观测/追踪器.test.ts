import { describe, it, expect, beforeEach } from 'vitest'
import { 环形缓冲 } from './环形缓冲'
import { 追踪器, 包裹跨度 } from './追踪器'

describe('Tracer', () => {
  let 缓冲区: 环形缓冲
  let 追踪器实例: 追踪器

  beforeEach(() => {
    缓冲区 = new 环形缓冲(4096)
    追踪器实例 = new 追踪器(缓冲区)
  })

  it('creates a root span', () => {
    const 跨度编号 = 追踪器实例.开始跨度('root')
    expect(跨度编号).toBe(1)
    const 跨度 = 追踪器实例.获取当前跨度()
    expect(跨度).not.toBeNull()
    expect(跨度!.spanId).toBe(1)
    expect(跨度!.traceId).toBe(1)
    expect(跨度!.parentSpanId).toBeNull()
    expect(跨度!.name).toBe('root')
    expect(跨度!.startTime).toBeTypeOf('bigint')
    expect(跨度!.status).toBe('unset')
  })

  it('creates nested spans', () => {
    const 根编号 = 追踪器实例.开始跨度('root')
    const 子编号 = 追踪器实例.开始跨度('child', 根编号)
    expect(子编号).toBe(2)
    const 子项 = 追踪器实例.获取当前跨度()
    expect(子项!.spanId).toBe(2)
    expect(子项!.parentSpanId).toBe(1)
    expect(子项!.traceId).toBe(1)
  })

  it('auto-parents to current active span', () => {
    追踪器实例.开始跨度('root')
    const 子编号 = 追踪器实例.开始跨度('auto-child')
    expect(子编号).toBe(2)
    const 子项 = 追踪器实例.获取当前跨度()
    expect(子项!.parentSpanId).toBe(1)
    expect(子项!.traceId).toBe(1)
  })

  it('ends span with ok status', () => {
    const 跨度编号 = 追踪器实例.开始跨度('test')
    追踪器实例.结束跨度(跨度编号, 'ok')
    const 跨度 = 追踪器实例.获取当前跨度()
    expect(跨度).toBeNull()
    const 全部 = 追踪器实例.获取跨度表()
    const 已结束 = 全部.find((s) => s.spanId === 跨度编号)
    expect(已结束).not.toBeUndefined()
    expect(已结束!.status).toBe('ok')
    expect(已结束!.endTime).toBeTypeOf('bigint')
    expect(Number(已结束!.endTime)).toBeGreaterThanOrEqual(Number(已结束!.startTime))
  })

  it('ends span with error status', () => {
    const 跨度编号 = 追踪器实例.开始跨度('fail')
    追踪器实例.结束跨度(跨度编号, 'error')
    const 全部 = 追踪器实例.获取跨度表()
    const 已结束 = 全部.find((s) => s.spanId === 跨度编号)
    expect(已结束!.status).toBe('error')
    expect(已结束!.endTime).toBeTypeOf('bigint')
  })

  it('getCurrentSpan returns innermost active', () => {
    const r1 = 追踪器实例.开始跨度('outer')
    追踪器实例.开始跨度('inner')
    const current = 追踪器实例.获取当前跨度()
    expect(current!.name).toBe('inner')
    expect(current!.parentSpanId).toBe(r1)
  })

  it('withSpan wraps async function', async () => {
    const 结果 = await 包裹跨度(追踪器实例, 'async-task', async () => {
      return 42
    })
    expect(结果).toBe(42)
    const 全部 = 追踪器实例.获取跨度表()
    const 跨度 = 全部.find((s) => s.name === 'async-task')
    expect(跨度).not.toBeUndefined()
    expect(跨度!.status).toBe('ok')
    expect(跨度!.endTime).toBeTypeOf('bigint')
  })

  it('withSpan marks error on exception', async () => {
    await expect(
      包裹跨度(追踪器实例, 'bad-task', async () => {
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')
    const 全部 = 追踪器实例.获取跨度表()
    const 跨度 = 全部.find((s) => s.name === 'bad-task')
    expect(跨度).not.toBeUndefined()
    expect(跨度!.status).toBe('error')
    expect(跨度!.endTime).toBeTypeOf('bigint')
  })

  it('prune removes old completed spans', () => {
    const 编号表: number[] = []
    for (let i = 0; i < 150; i++) {
      编号表.push(追踪器实例.开始跨度(`span-${i}`))
    }
    for (const id of 编号表) {
      追踪器实例.结束跨度(id)
    }
    expect(追踪器实例.获取跨度表().length).toBe(150)
    追踪器实例.修剪()
    expect(追踪器实例.获取跨度表().length).toBe(100)
  })

  it('writes start/end events to ringBuffer', () => {
    const 会话编号 = 追踪器实例.开始跨度('log-test')
    追踪器实例.结束跨度(会话编号)
    const 条目表 = 缓冲区.读取()
    const 消息表 = 条目表.map((e) => e.message)
    expect(消息表).toContain('[span:start] log-test')
    expect(消息表).toContain('[span:end] log-test')
  })

  it('getSpans returns all spans', () => {
    追踪器实例.开始跨度('a')
    追踪器实例.开始跨度('b')
    expect(追踪器实例.获取跨度表().length).toBe(2)
    追踪器实例.结束跨度(2)
    const 全部 = 追踪器实例.获取跨度表()
    expect(全部.length).toBe(2)
    expect(全部.filter((s) => s.status === 'unset').length).toBe(1)
    expect(全部.filter((s) => s.status === 'ok').length).toBe(1)
  })
})

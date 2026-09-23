import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountUp } from './useCountUp'

/**
 * 手动推进 rAF 帧并把 performance.now 钉在指定时刻，
 * 让「半程仍在滚动 / 满程到终态」这类时长断言可重复。
 */
function 挂载滚动(value: string, durationMs?: number, 选项?: { start?: boolean; zeroUntilStart?: boolean }) {
  let 时钟 = 0
  let 帧队列: FrameRequestCallback[] = []
  vi.spyOn(performance, 'now').mockImplementation(() => 时钟)
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((帧) => {
    帧队列.push(帧)
    return 0
  })

  const 句柄 = renderHook(() =>
    useCountUp({
      value,
      durationMs,
      enabled: true,
      start: 选项?.start ?? true,
      zeroUntilStart: 选项?.zeroUntilStart ?? false,
    })
  )

  const 推进 = async (时间ms: number) => {
    时钟 = 时间ms
    const 本批 = 帧队列
    帧队列 = []
    await act(async () => {
      for (const 帧 of 本批) 帧(时间ms)
    })
  }

  return { 显示: () => 句柄.result.current.display, 推进, 卸载: () => 句柄.unmount() }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useCountUp 量化指标格式', () => {
  it('纯数字 "9"：从 0 滚到 9，满程终态就是 "9"', async () => {
    const { 显示, 推进, 卸载 } = 挂载滚动('9', 640)
    await 推进(0)
    await 推进(320)
    expect(显示()).toMatch(/^\d$/)
    expect(显示()).not.toBe('9')
    await 推进(640)
    expect(显示()).toBe('9')
    卸载()
  })

  it('数字 + 中文后缀 "7年"：后缀全程保留，满程终态就是 "7年"', async () => {
    const { 显示, 推进, 卸载 } = 挂载滚动('7年', 640)
    await 推进(0)
    await 推进(320)
    expect(显示()).toMatch(/^\d年$/)
    expect(显示()).not.toBe('7年')
    await 推进(640)
    expect(显示()).toBe('7年')
    卸载()
  })

  it('带前后缀 "400+"：前缀空、后缀 + 全程不丢，满程终态回到完整串', async () => {
    const { 显示, 推进, 卸载 } = 挂载滚动('400+', 640)
    await 推进(0)
    await 推进(320)
    expect(显示().endsWith('+')).toBe(true)
    expect(显示()).not.toBe('400+')
    await 推进(640)
    expect(显示()).toBe('400+')
    卸载()
  })

  it('时长决定半程状态：同一时刻 320ms 时长已终态、640ms 时长仍在滚动', async () => {
    const 快 = 挂载滚动('400+', 320)
    await 快.推进(0)
    await 快.推进(320)
    expect(快.显示()).toBe('400+')
    快.卸载()

    const 慢 = 挂载滚动('400+', 640)
    await 慢.推进(0)
    await 慢.推进(320)
    expect(慢.显示()).not.toBe('400+')
    慢.卸载()
  })
})

describe('useCountUp zeroUntilStart（指标卡进视口前不剧透终态）', () => {
  it('未 start 时显示 0 同前后缀形态，而不是终态', async () => {
    const 句柄 = renderHook(() =>
      useCountUp({ value: '400+', durationMs: 640, enabled: true, start: false, zeroUntilStart: true })
    )
    await act(async () => {})
    expect(句柄.result.current.display).toBe('0+')

    const 带后缀 = renderHook(() =>
      useCountUp({ value: '7年', durationMs: 640, enabled: true, start: false, zeroUntilStart: true })
    )
    await act(async () => {})
    expect(带后缀.result.current.display).toBe('0年')

    const 纯数字 = renderHook(() =>
      useCountUp({ value: '9', durationMs: 640, enabled: true, start: false, zeroUntilStart: true })
    )
    await act(async () => {})
    expect(纯数字.result.current.display).toBe('0')
  })

  it('zeroUntilStart 启动后从 0 滚到终态；关闭时未 start 直接终态（经历年份口径）', async () => {
    const 指标 = 挂载滚动('400+', 640, { start: true, zeroUntilStart: true })
    await 指标.推进(0)
    await 指标.推进(320)
    expect(指标.显示()).not.toBe('400+')
    expect(指标.显示().endsWith('+')).toBe(true)
    await 指标.推进(640)
    expect(指标.显示()).toBe('400+')
    指标.卸载()

    const 年份 = renderHook(() =>
      useCountUp({ value: '2022 - 至今', durationMs: 320, enabled: true, start: false, zeroUntilStart: false })
    )
    await act(async () => {})
    expect(年份.result.current.display).toBe('2022 - 至今')
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useTypewriter, type 打字机选项 } from './useTypewriter'

type 帧环境 = {
  挂载: (选项: 打字机选项) => {
    读取: () => ReturnType<typeof useTypewriter>
    推进: (时间: number) => Promise<void>
    卸载: () => void
  }
}

function 创建帧环境(): 帧环境 {
  let 帧队列: FrameRequestCallback[] = []
  let 下一个句柄 = 1

  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((回调) => {
    帧队列.push(回调)
    return 下一个句柄++
  })
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})

  return {
    挂载: (选项) => {
      帧队列 = []
      const 句柄 = renderHook(() => useTypewriter(选项))
      const 推进 = async (时间: number) => {
        const 本批 = 帧队列
        帧队列 = []
        await act(async () => {
          for (const 回调 of 本批) 回调(时间)
        })
      }
      return {
        读取: () => 句柄.result.current,
        推进,
        卸载: 句柄.unmount,
      }
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useTypewriter 绝对时间进度', () => {
  it('不同帧序列在同一经过时间得到相同进度且首帧不虚增', async () => {
    const 帧环境 = 创建帧环境()
    const 选项: 打字机选项 = { 每行文本: ['0123456789'], 开始: true, 每字毫秒: 20 }

    const 少帧 = 帧环境.挂载(选项)
    await 少帧.推进(0)
    expect(少帧.读取().已显字符数).toBe(0)
    await 少帧.推进(16)
    await 少帧.推进(40)
    await 少帧.推进(80)
    const 少帧进度 = 少帧.读取().已显字符数
    expect(少帧进度).toBe(4)
    少帧.卸载()

    const 多帧 = 帧环境.挂载(选项)
    await 多帧.推进(0)
    await 多帧.推进(4)
    await 多帧.推进(8)
    await 多帧.推进(12)
    await 多帧.推进(20)
    await 多帧.推进(40)
    await 多帧.推进(80)
    expect(多帧.读取().已显字符数).toBe(少帧进度)
    多帧.卸载()
  })

  it('到达总长与每字毫秒对应的时长时完成全文', async () => {
    const 帧环境 = 创建帧环境()
    const 句柄 = 帧环境.挂载({ 每行文本: ['0123456789'], 开始: true, 每字毫秒: 20 })

    await 句柄.推进(0)
    await 句柄.推进(200)

    expect(句柄.读取()).toMatchObject({ 已显字符数: 10, 总长: 10, 已打完: true })
    句柄.卸载()
  })

  it('未开始、空文本与减少动画保持既有行为', () => {
    const 帧环境 = 创建帧环境()
    const 未开始 = 帧环境.挂载({ 每行文本: ['0123456789'], 开始: false, 每字毫秒: 20 })
    expect(未开始.读取()).toMatchObject({ 已显字符数: 0, 总长: 10, 已打完: false })
    未开始.卸载()

    const 空文本 = 帧环境.挂载({ 每行文本: [], 开始: true, 每字毫秒: 20 })
    expect(空文本.读取()).toMatchObject({ 已显字符数: 0, 总长: 0, 已打完: true })
    空文本.卸载()

    const 减少动画 = 帧环境.挂载({ 每行文本: ['0123456789'], 开始: true, 减少动画: true, 每字毫秒: 20 })
    expect(减少动画.读取()).toMatchObject({ 已显字符数: 10, 总长: 10, 已打完: true })
    减少动画.卸载()
  })

  it('卸载时取消未完成的动画帧', () => {
    const 帧环境 = 创建帧环境()
    const 句柄 = 帧环境.挂载({ 每行文本: ['0123456789'], 开始: true, 每字毫秒: 20 })

    expect(globalThis.requestAnimationFrame).toHaveBeenCalledTimes(1)
    句柄.卸载()
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(1)
  })
})

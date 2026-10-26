import { useEffect, useRef, useState } from 'react'

export interface 打字机选项 {
  每行文本: string[]

  开始: boolean

  减少动画?: boolean

  每字毫秒?: number
}

export interface 打字机状态 {
  已显字符数: number

  总长: number

  已打完: boolean
}

export function useDaZiJi({ 每行文本, 开始, 减少动画 = false, 每字毫秒 = 48 }: 打字机选项): 打字机状态 {
  const 总长 = 每行文本.reduce((累计, 行) => 累计 + 行.length, 0)
  const 重置键 = `${减少动画 ? 1 : 0}|${开始 ? 1 : 0}|${总长}`
  const [进度, 设进度] = useState(() => ({ 重置键, 已显字符数: 减少动画 ? 总长 : 0 }))

  if (进度.重置键 !== 重置键) {
    设进度({ 重置键, 已显字符数: 减少动画 ? 总长 : 0 })
  }

  const 帧引用 = useRef<number | null>(null)

  useEffect(() => {
    if (减少动画 || !开始 || 总长 <= 0) return

    let 启动时间: number | null = null
    const 步进 = (现在: number) => {
      if (启动时间 === null) 启动时间 = 现在
      const 经过 = Math.max(0, 现在 - 启动时间)
      const 当前 = Math.min(总长, Math.round(经过 / 每字毫秒))
      设进度((旧) => (旧.重置键 === 重置键 ? { 重置键, 已显字符数: 当前 } : 旧))
      if (当前 < 总长) {
        帧引用.current = requestAnimationFrame(步进)
      } else {
        帧引用.current = null
      }
    }

    帧引用.current = requestAnimationFrame(步进)

    return () => {
      if (帧引用.current !== null) cancelAnimationFrame(帧引用.current)
      帧引用.current = null
    }
  }, [开始, 减少动画, 总长, 每字毫秒, 重置键])

  const 已显字符数 = 进度.已显字符数

  return {
    已显字符数,
    总长,
    已打完: 已显字符数 >= 总长,
  }
}

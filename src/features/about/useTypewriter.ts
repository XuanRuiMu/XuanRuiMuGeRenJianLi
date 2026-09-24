import { useEffect, useRef, useState } from 'react'

export interface 打字机选项 {
  /** 每一行完整的文本（按顺序拼接后与源文本一致） */
  每行文本: string[]
  /** 是否开始打字：由 IntersectionObserver 在进入视口时置为 true */
  开始: boolean
  /** 是否启用减少动画：为 true 时直接呈现全文，不播放打字 */
  减少动画?: boolean
  /** 每个字符之间的间隔（毫秒） */
  每字毫秒?: number
}

export interface 打字机状态 {
  /** 跨所有行累计已显示的字符数 */
  已显字符数: number
  /** 全部文本的总字符数 */
  总长: number
  /** 是否已全部打完 */
  已打完: boolean
}

/**
 * 零依赖打字机 hook：按时间片批量推进累计字符数，避免 setTimeout 逐字在
 * React 重渲染下被拖慢。组件按累计数裁剪每一行的可见子串，即可实现逐字、
 * 逐行、顺序揭示。卸载时取消动画帧，避免泄漏。
 */
export function useTypewriter({ 每行文本, 开始, 减少动画 = false, 每字毫秒 = 48 }: 打字机选项): 打字机状态 {
  const 总长 = 每行文本.reduce((累计, 行) => 累计 + 行.length, 0)
  const [已显字符数, set已显字符数] = useState(减少动画 ? 总长 : 0)
  const 帧引用 = useRef<number | null>(null)

  useEffect(() => {
    if (减少动画) {
      set已显字符数(总长)
      return
    }
    if (!开始 || 总长 <= 0) {
      set已显字符数(0)
      return
    }

    let 当前 = 0
    let 上次时间: number | null = null
    set已显字符数(0)

    const 步进 = (现在: number) => {
      if (上次时间 === null) 上次时间 = 现在
      const 经过 = 现在 - 上次时间
      上次时间 = 现在
      const 推进数 = 总长 <= 0 ? 0 : Math.max(1, Math.round(经过 / 每字毫秒))
      当前 = Math.min(总长, 当前 + 推进数)
      set已显字符数(当前)
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
  }, [开始, 减少动画, 总长, 每字毫秒])

  return {
    已显字符数,
    总长,
    已打完: 已显字符数 >= 总长,
  }
}

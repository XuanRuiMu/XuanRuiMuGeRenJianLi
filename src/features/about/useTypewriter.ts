import { useEffect, useRef, useState } from 'react'

interface 打字机选项 {
  /** 每一行完整的文本（按顺序拼接后与源文本一致） */
  每行文本: string[]
  /** 是否开始打字：由 IntersectionObserver 在进入视口时置为 true */
  开始: boolean
  /** 是否启用减少动画：为 true 时直接呈现全文，不播放打字 */
  减少动画?: boolean
  /** 每个字符之间的间隔（毫秒） */
  每字毫秒?: number
}

interface 打字机状态 {
  /** 跨所有行累计已显示的字符数 */
  已显字符数: number
  /** 全部文本的总字符数 */
  总长: number
  /** 是否已全部打完 */
  已打完: boolean
}

/**
 * 零依赖打字机 hook：用 setTimeout 链式推进累计字符数。
 * 组件按累计数裁剪每一行的可见子串，即可实现逐字、逐行、顺序揭示。
 * 卸载时清理定时器，避免泄漏。
 */
export function useTypewriter({ 每行文本, 开始, 减少动画 = false, 每字毫秒 = 48 }: 打字机选项): 打字机状态 {
  const 总长 = 每行文本.reduce((累计, 行) => 累计 + 行.length, 0)
  const [已显字符数, set已显字符数] = useState(减少动画 ? 总长 : 0)
  const 定时器引用 = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (减少动画) {
      set已显字符数(总长)
      return
    }
    if (!开始) return

    set已显字符数(0)
    let 当前 = 0
    const 推进一步 = () => {
      if (当前 >= 总长) {
        定时器引用.current = null
        return
      }
      当前 += 1
      set已显字符数(当前)
      定时器引用.current = setTimeout(推进一步, 每字毫秒)
    }
    定时器引用.current = setTimeout(推进一步, 每字毫秒)

    return () => {
      if (定时器引用.current) clearTimeout(定时器引用.current)
    }
  }, [开始, 减少动画, 总长, 每字毫秒])

  return {
    已显字符数,
    总长,
    已打完: 已显字符数 >= 总长,
  }
}

import { useEffect, useRef, useState } from 'react'

export interface 数字滚动选项 {
  /** 最终要显示的字符串（如 "2022 - 至今" 或 "2024"）。 */
  值: string
  /** 动画时长（ms），落在 250–400 区间手感最佳。 */
  时长毫秒?: number
  /** 是否启用动画；reducedMotion 场景传 false 直接终态。 */
  启用?: boolean
  /** 触发动画（卡片进入视口后置 true）。未触发时展示形态见 zeroUntilStart。 */
  开始?: boolean
  /**
   * true：未触发时显示 0 的同前后缀形态（如 "0+"/"0年"），滚入视口后再递增到终态。
   * false：未触发时直接终态（经历年份等，避免出现 "0 - 至今"）。
   */
  开始前为零?: boolean
}

const 数字标记 = /(\d+)/

interface 解析值 {
  前缀: string
  目标: number
  后缀: string
}

function 解析数值(值: string): 解析值 | null {
  const 匹配 = 值.match(数字标记)
  if (!匹配 || 匹配.index === undefined || 匹配[1] === undefined) return null
  const 数字串 = 匹配[1]
  return {
    前缀: 值.slice(0, 匹配.index),
    目标: parseInt(数字串, 10),
    后缀: 值.slice(匹配.index + 数字串.length),
  }
}

function 格式化至(解析: 解析值, n: number): string {
  return `${解析.前缀}${String(n)}${解析.后缀}`
}

/**
 * 把字符串中的数字按位从 0 滚动到目标值（如 "2022 - 至今" 中的年份）。
 * 非数字部分原样保留。zeroUntilStart 时未触发先显示 0 形态，触发后 rAF 做 easeOutCubic 滚动。
 */
export function useShuZiGunDong({ 值, 时长毫秒 = 320, 启用 = true, 开始 = false, 开始前为零 = false }: 数字滚动选项): {
  显示: string
} {
  const [显示, 设显示] = useState(() => {
    const 解析 = 解析数值(值)
    if (!启用 || !开始前为零 || !解析 || 解析.目标 <= 0) return 值
    return 格式化至(解析, 0)
  })
  const 动画帧引用 = useRef<number | null>(null)
  const 完成引用 = useRef(false)
  const 解析引用 = useRef<解析值 | null>(解析数值(值))

  useEffect(() => {
    解析引用.current = 解析数值(值)
    完成引用.current = false
    const 解析 = 解析引用.current
    queueMicrotask(() => {
      if (!启用 || !开始前为零 || !解析 || 解析.目标 <= 0) {
        设显示(值)
        return
      }
      设显示(格式化至(解析, 0))
    })
  }, [值, 启用, 开始前为零])

  useEffect(() => {
    const 解析 = 解析引用.current
    if (!启用 || !解析 || 解析.目标 <= 0) {
      设显示(值)
      return
    }
    if (!开始) {
      设显示(开始前为零 ? 格式化至(解析, 0) : 值)
      return
    }
    if (完成引用.current) {
      设显示(值)
      return
    }

    const 格式化 = (n: number) => 格式化至(解析, n)

    const 运行 = () => {
      const 起始时刻 = performance.now()
      const 滴答 = (当前时刻: number) => {
        const 进度 = Math.min(1, (当前时刻 - 起始时刻) / 时长毫秒)
        const 缓动 = 1 - Math.pow(1 - 进度, 3)
        const 当前值 = Math.round(缓动 * 解析.目标)
        设显示(格式化(当前值))
        if (进度 < 1) {
          动画帧引用.current = requestAnimationFrame(滴答)
        } else {
          完成引用.current = true
          设显示(值)
        }
      }
      动画帧引用.current = requestAnimationFrame(滴答)
    }

    // 延后到下一帧启动，保证首帧（测试/SSR）可预期。
    动画帧引用.current = requestAnimationFrame(运行)

    return () => {
      if (动画帧引用.current !== null) {
        cancelAnimationFrame(动画帧引用.current)
        动画帧引用.current = null
      }
    }
  }, [启用, 开始, 值, 时长毫秒, 开始前为零])

  return { 显示 }
}

import { useEffect, useRef, useState } from 'react'

export interface UseCountUpOptions {
  /** 最终要显示的字符串（如 "2022 - 至今" 或 "2024"）。 */
  value: string
  /** 动画时长（ms），落在 250–400 区间手感最佳。 */
  durationMs?: number
  /** 是否启用动画；reducedMotion 场景传 false 直接终态。 */
  enabled?: boolean
  /** 触发动画（卡片进入视口后置 true）。未触发时直接展示终态，保证 SSR/测试稳定。 */
  start?: boolean
}

const NUMERIC_TOKEN = /(\d+)/

interface ParsedValue {
  prefix: string
  target: number
  suffix: string
}

function parseValue(value: string): ParsedValue | null {
  const match = value.match(NUMERIC_TOKEN)
  if (!match || match.index === undefined || match[1] === undefined) return null
  const numStr = match[1]
  return {
    prefix: value.slice(0, match.index),
    target: parseInt(numStr, 10),
    suffix: value.slice(match.index + numStr.length),
  }
}

/**
 * 把字符串中的数字按位从 0 滚动到目标值（如 "2022 - 至今" 中的年份）。
 * 非数字部分原样保留。初始渲染即展示终态，触发后再用 rAF 批处理做 easeOutCubic 滚动。
 */
export function useCountUp({
  value,
  durationMs = 320,
  enabled = true,
  start = false,
}: UseCountUpOptions): { display: string } {
  const [display, setDisplay] = useState(value)
  const rafRef = useRef<number | null>(null)
  const doneRef = useRef(false)
  const parsedRef = useRef<ParsedValue | null>(parseValue(value))

  useEffect(() => {
    parsedRef.current = parseValue(value)
    doneRef.current = false
    setDisplay(value)
  }, [value])

  useEffect(() => {
    const parsed = parsedRef.current
    if (!enabled || !start || !parsed || parsed.target <= 0) {
      setDisplay(value)
      return
    }
    if (doneRef.current) {
      setDisplay(value)
      return
    }

    const format = (n: number) => `${parsed.prefix}${String(n)}${parsed.suffix}`

    const run = () => {
      const startTime = performance.now()
      const tick = (now: number) => {
        const ratio = Math.min(1, (now - startTime) / durationMs)
        const eased = 1 - Math.pow(1 - ratio, 3)
        const current = Math.round(eased * parsed.target)
        setDisplay(format(current))
        if (ratio < 1) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          doneRef.current = true
          setDisplay(value)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    // 延后到下一帧启动，保证首帧（测试/SSR）直接呈现终态文本。
    rafRef.current = requestAnimationFrame(run)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [enabled, start, value, durationMs])

  return { display }
}

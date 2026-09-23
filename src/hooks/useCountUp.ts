import { useEffect, useRef, useState } from 'react'

export interface UseCountUpOptions {
  /** 最终要显示的字符串（如 "2022 - 至今" 或 "2024"）。 */
  value: string
  /** 动画时长（ms），落在 250–400 区间手感最佳。 */
  durationMs?: number
  /** 是否启用动画；reducedMotion 场景传 false 直接终态。 */
  enabled?: boolean
  /** 触发动画（卡片进入视口后置 true）。未触发时展示形态见 zeroUntilStart。 */
  start?: boolean
  /**
   * true：未触发时显示 0 的同前后缀形态（如 "0+"/"0年"），滚入视口后再递增到终态。
   * false：未触发时直接终态（经历年份等，避免出现 "0 - 至今"）。
   */
  zeroUntilStart?: boolean
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

function formatAt(parsed: ParsedValue, n: number): string {
  return `${parsed.prefix}${String(n)}${parsed.suffix}`
}

/**
 * 把字符串中的数字按位从 0 滚动到目标值（如 "2022 - 至今" 中的年份）。
 * 非数字部分原样保留。zeroUntilStart 时未触发先显示 0 形态，触发后 rAF 做 easeOutCubic 滚动。
 */
export function useCountUp({
  value,
  durationMs = 320,
  enabled = true,
  start = false,
  zeroUntilStart = false,
}: UseCountUpOptions): {
  display: string
} {
  const [display, setDisplay] = useState(() => {
    const parsed = parseValue(value)
    if (!enabled || !zeroUntilStart || !parsed || parsed.target <= 0) return value
    return formatAt(parsed, 0)
  })
  const rafRef = useRef<number | null>(null)
  const doneRef = useRef(false)
  const parsedRef = useRef<ParsedValue | null>(parseValue(value))

  useEffect(() => {
    parsedRef.current = parseValue(value)
    doneRef.current = false
    const parsed = parsedRef.current
    queueMicrotask(() => {
      if (!enabled || !zeroUntilStart || !parsed || parsed.target <= 0) {
        setDisplay(value)
        return
      }
      setDisplay(formatAt(parsed, 0))
    })
  }, [value, enabled, zeroUntilStart])

  useEffect(() => {
    const parsed = parsedRef.current
    if (!enabled || !parsed || parsed.target <= 0) {
      setDisplay(value)
      return
    }
    if (!start) {
      setDisplay(zeroUntilStart ? formatAt(parsed, 0) : value)
      return
    }
    if (doneRef.current) {
      setDisplay(value)
      return
    }

    const format = (n: number) => formatAt(parsed, n)

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

    // 延后到下一帧启动，保证首帧（测试/SSR）可预期。
    rafRef.current = requestAnimationFrame(run)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [enabled, start, value, durationMs, zeroUntilStart])

  return { display }
}

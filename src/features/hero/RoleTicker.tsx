import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * 角色行：1:1 复刻 02-react-three-fiber 的 typed.js 打字机语义。
 * 逐字打出(typeSpeed) → 停顿(backDelay) → 逐字删字(backSpeed) → 下一词 → 循环(loop) + 闪烁光标。
 * 中文岗位由工作区技术栈推导（全栈 / Java 后端 / AI 工具 / 游戏服务端 / DevOps）。
 * reduced-motion 时静态显示首个角色，光标不闪烁。
 */
const ROLES = ['全栈开发工程师', 'Java 后端开发', 'AI 工具开发', '游戏服务端架构', 'DevOps 工程师']

interface RoleTickerProps {
  roles?: string[]
  typeSpeed?: number
  backSpeed?: number
  backDelay?: number
}

export function RoleTicker({
  roles = ROLES,
  typeSpeed = 60,
  backSpeed = 40,
  backDelay = 1500,
}: RoleTickerProps) {
  const reducedMotion = useReducedMotion()
  const [text, setText] = useState(reducedMotion ? roles[0] : '')
  const roleRef = useRef(0)
  const charRef = useRef(0)
  const deletingRef = useRef(false)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (reducedMotion || roles.length === 0) return
    let cancelled = false

    const tick = () => {
      if (cancelled) return
      const current = roles[roleRef.current]
      if (!deletingRef.current) {
        charRef.current += 1
        setText(current.slice(0, charRef.current))
        if (charRef.current >= current.length) {
          deletingRef.current = true
          timerRef.current = window.setTimeout(tick, backDelay)
        } else {
          timerRef.current = window.setTimeout(tick, typeSpeed)
        }
      } else {
        charRef.current -= 1
        setText(current.slice(0, charRef.current))
        if (charRef.current <= 0) {
          deletingRef.current = false
          roleRef.current = (roleRef.current + 1) % roles.length
          timerRef.current = window.setTimeout(tick, typeSpeed)
        } else {
          timerRef.current = window.setTimeout(tick, backSpeed)
        }
      }
    }

    timerRef.current = window.setTimeout(tick, typeSpeed)
    return () => {
      cancelled = true
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [reducedMotion, roles, typeSpeed, backSpeed, backDelay])

  return (
    <p
      className="mb-4 flex items-center gap-2 text-lg font-medium text-shadow-readable sm:text-xl"
      aria-label={`多重身份：${roles.join('、')}`}
      data-testid="role-typewriter"
    >
      <span aria-hidden="true" className="font-mono text-primary">
        {'>'}
      </span>
      <span className="inline-flex items-end font-mono" role="status" aria-live="off">
        <span className="bg-gradient-to-r from-[#34d399] to-[#38ef7d] bg-clip-text font-semibold text-transparent">
          {text}
        </span>
        <span
          aria-hidden="true"
          className={cn('ml-0.5 text-[#38ef7d]', !reducedMotion && 'caret-blink')}
        >
          {reducedMotion ? '' : '|'}
        </span>
      </span>
    </p>
  )
}

import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { t } from '../../i18n/translations'
import { careerFocus, 岗位名表 } from '../../data/careerFocus'
import { 字符渐变色 } from './roleGradient'

/**
 * 角色行：1:1 复刻 02-react-three-fiber 的 typed.js 打字机语义。
 * 逐字打出(typeSpeed) → 停顿(backDelay) → 逐字删字(backSpeed) → 下一词 → 循环(loop) + 闪烁光标。
 * 岗位名来自单一数据源（src/data/careerFocus.ts → 项目根 职业定位.txt），aria 前缀来自 zh-CN.json career 节点。
 * reduced-motion 时静态显示首个角色，光标不闪烁。
 */

interface RoleTickerProps {
  roles?: string[]
  typeSpeed?: number
  backSpeed?: number
  backDelay?: number
}

/** 默认岗位：模块级解析一次，保持引用稳定（locale 为编译期常量）；文案单一源见 careerFocus */
const 默认岗位名表 = 岗位名表()

export function RoleTicker({
  roles = 默认岗位名表,
  // 用户要求整体放缓为原来的 1/2：逐字/删字/停顿时长全部翻倍（60→120 / 40→80 / 1500→3000）
  typeSpeed = 120,
  backSpeed = 80,
  backDelay = 3000,
}: RoleTickerProps) {
  const reducedMotion = useReducedMotion()
  // 岗位清单可为空（职业定位.txt 被删空或只剩注释）：退回同一 career 节点的方向串，
  // 既不渲染 undefined 也不留空白
  const 有岗位 = roles.length > 0
  const 岗位表 = 有岗位 ? roles : [t(careerFocus.directionKey)]
  // 词与文本必须成对更新：渲染期需要「当前完整词长」为字符预分配最终颜色
  const [打字, set打字] = useState(() => ({
    词: 岗位表[0],
    文本: reducedMotion || !有岗位 ? 岗位表[0] : '',
  }))
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
      let nextText: string
      if (!deletingRef.current) {
        charRef.current += 1
        nextText = current.slice(0, charRef.current)
        if (charRef.current >= current.length) {
          deletingRef.current = true
          timerRef.current = window.setTimeout(tick, backDelay)
        } else {
          timerRef.current = window.setTimeout(tick, typeSpeed)
        }
      } else {
        charRef.current -= 1
        nextText = current.slice(0, charRef.current)
        if (charRef.current <= 0) {
          deletingRef.current = false
          roleRef.current = (roleRef.current + 1) % roles.length
          timerRef.current = window.setTimeout(tick, typeSpeed)
        } else {
          timerRef.current = window.setTimeout(tick, backSpeed)
        }
      }
      set打字({ 词: current, 文本: nextText })
    }

    timerRef.current = window.setTimeout(tick, typeSpeed)
    return () => {
      cancelled = true
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [reducedMotion, roles, typeSpeed, backSpeed, backDelay])

  return (
    <p
      className="mb-4 flex items-center gap-2 text-3xl font-medium text-shadow-readable sm:text-4xl"
      aria-label={`${t(careerFocus.roleTickerAriaKey)}${岗位表.join('、')}`}
      data-testid="role-typewriter"
    >
      <span aria-hidden="true" className="font-mono text-primary">
        {'>'}
      </span>
      <span className="inline-flex items-end font-mono" role="status" aria-live="off">
        {/* 逐字定色：颜色由该字符在完整词中的位置决定，与当前打字进度无关。
            whitespace-pre 必需：每个 span 是 flex item（被块化），仅含空白的 item 会折叠为 0 宽而吞掉空格 */}
        {打字.文本.split('').map((char, index) => (
          <span
            key={`${index}-${char}`}
            className="whitespace-pre"
            style={{ color: 字符渐变色(index, 打字.词.length) }}
          >
            {char}
          </span>
        ))}
        <span aria-hidden="true" className={cn('ml-0.5 text-[#f0abfc]', !reducedMotion && 'caret-blink')}>
          {reducedMotion ? '' : '|'}
        </span>
      </span>
    </p>
  )
}

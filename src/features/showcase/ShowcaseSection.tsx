import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  GraduationCap,
  Code2,
  Network,
  Database,
  Users,
  Drama,
  Palette,
  Sparkles,
  Shapes,
  Brush,
  BookOpen,
  Mic,
  Gamepad2,
  MonitorPlay,
  Music,
  type LucideIcon,
} from 'lucide-react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { showcaseRows, type ShowcaseCard } from '../../data/showcase'
import { t } from '../../i18n/translations'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/** 卡片图标映射（按卡片 id） */
const CARD_ICONS: Record<string, LucideIcon> = {
  degree: GraduationCap,
  coding: Code2,
  systems: Network,
  lowlevel: Database,
  teaching: Users,
  resumeTheater: Drama,
  xrmUi: Palette,
  aiToolchain: Sparkles,
  toolbox: Shapes,
  generative: Brush,
  novel: BookOpen,
  comedy: Mic,
  gameWorld: Gamepad2,
  courses: MonitorPlay,
  escape: Music,
}

/** 渐变描边与霓虹光晕（12-next-spline-3d ProductCard 原样移植，9 组循环） */
const GRADIENTS = [
  'from-purple-500 to-blue-500',
  'from-orange-400 to-yellow-500',
  'from-pink-500 to-red-500',
  'from-cyan-400 to-blue-500',
  'from-green-400 to-lime-500',
  'from-fuchsia-500 to-pink-500',
  'from-yellow-400 to-orange-500',
  'from-blue-400 to-indigo-500',
  'from-green-400 to-emerald-500',
]

const NEON_SHADOWS = [
  'shadow-[0_0_30px_5px_rgba(147,51,234,0.4)]',
  'shadow-[0_0_30px_5px_rgba(251,191,36,0.4)]',
  'shadow-[0_0_30px_5px_rgba(236,72,153,0.4)]',
  'shadow-[0_0_30px_5px_rgba(34,211,238,0.4)]',
  'shadow-[0_0_30px_5px_rgba(132,204,22,0.4)]',
  'shadow-[0_0_30px_5px_rgba(232,121,249,0.4)]',
  'shadow-[0_0_30px_5px_rgba(251,191,36,0.4)]',
  'shadow-[0_0_30px_5px_rgba(59,130,246,0.4)]',
  'shadow-[0_0_30px_5px_rgba(16,185,129,0.4)]',
]

/** 图标主色与渐变组对应，保证卡内视觉与描边同系 */
const ICON_COLORS = [
  '#a78bfa',
  '#fbbf24',
  '#f472b6',
  '#22d3ee',
  '#a3e635',
  '#e879f9',
  '#facc15',
  '#60a5fa',
  '#34d399',
]

interface ShowcaseProductCardProps {
  card: ShowcaseCard
  index: number
  reducedMotion: boolean
}

function ShowcaseProductCard({ card, index, reducedMotion }: ShowcaseProductCardProps) {
  const gradient = GRADIENTS[index % GRADIENTS.length]
  const neonShadow = NEON_SHADOWS[index % NEON_SHADOWS.length]
  const iconColor = ICON_COLORS[index % ICON_COLORS.length]
  const Icon = CARD_ICONS[card.id] ?? Shapes

  const inner = (
    <div className="flex h-full w-full flex-col justify-between rounded-xl bg-black p-5 md:p-6">
      <Icon size={44} style={{ color: iconColor }} aria-hidden="true" />
      <div>
        <h3 className="mb-1.5 text-base font-bold text-white md:text-lg">{t(card.titleKey)}</h3>
        <p className="text-xs leading-relaxed text-[#aaa6c3] md:text-sm">{t(card.descKey)}</p>
      </div>
    </div>
  )

  return (
    <div className="group/card h-32 w-[11rem] shrink-0 md:h-[26.75rem] md:w-[22rem] lg:h-96 lg:w-[30rem]">
      <motion.div
        whileHover={reducedMotion ? undefined : { y: -20 }}
        className="h-full w-full"
      >
        <div className={`h-full w-full rounded-xl bg-gradient-to-r p-[2px] ${gradient} ${neonShadow} md:p-[6px]`}>
          {card.href ? (
            <a
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-full w-full overflow-hidden rounded-xl bg-black transition-shadow group-hover/card:shadow-2xl"
            >
              {inner}
            </a>
          ) : (
            <div className="block h-full w-full overflow-hidden rounded-xl bg-black transition-shadow group-hover/card:shadow-2xl">
              {inner}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

/**
 * 单排自动横移轨道（根因修复）。
 *
 * 旧实现是「CSS translateX(-50%) 关键帧 + 卡片滚动视差 x + flex-row-reverse」三者混合：
 * 当视口宽 ≥ 单组宽、或滚动视差偏移与 -50% 取模不同步时，首尾衔接处露出空隙（断点）。
 *
 * 新实现改用统一的 requestAnimationFrame 引擎，从头消除该根因：
 * - 精确测量「单组」像素宽（含其尾部留白），用取模运算实现数学上严格的无缝首尾相接，
 *   任意视口宽度下都复制足够份数填满轨道，杜绝空隙；
 * - 速度做惯性平滑（当前速度向目标速度缓动），悬停任一张卡片 → 目标速度归零（缓停），
 *   鼠标移出 → 目标速度恢复（缓起）；
 * - 窗口发生上/下划动（wheel / touchmove）→ 全局暂停 1 秒，随后目标速度恢复（缓缓起步）；
 * - reduced-motion 完全静止，不注入任何 transform。
 */
function useAutoMarquee(opts: {
  direction: 1 | -1
  baseSpeed: number
  hoverPausedRef: React.MutableRefObject<boolean>
  reducedMotion: boolean
}) {
  const { direction, baseSpeed, hoverPausedRef, reducedMotion } = opts
  const trackRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)
  const [copies, setCopies] = useState(2)
  // 滚动暂停截止时间戳（本 hook 自持，悬停/滚动监听与 rAF 同闭包，杜绝跨组件 ref 错配）
  const scrollPauseUntilRef = useRef(0)

  const offsetRef = useRef(0)
  const speedRef = useRef(0)
  const groupWidthRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)

  const measure = useRef<() => void>(() => {})
  measure.current = () => {
    const el = groupRef.current
    if (!el) return
    const w = el.getBoundingClientRect().width
    if (w <= 0) return
    groupWidthRef.current = w
    const vw = window.innerWidth || document.documentElement.clientWidth || 0
    const needed = Math.max(2, Math.ceil((vw + w) / w) + 1)
    setCopies((prev) => (prev === needed ? prev : needed))
  }

  useLayoutEffect(() => {
    measure.current()
    const onResize = () => measure.current()
    if (typeof ResizeObserver !== 'undefined' && groupRef.current) {
      const ro = new ResizeObserver(onResize)
      ro.observe(groupRef.current)
      return () => ro.disconnect()
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('load', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('load', onResize)
    }
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      if (trackRef.current) trackRef.current.style.transform = ''
      return
    }

    // 全局滚动暂停：本 hook 自持监听（与 rAF 同闭包），任意排滚动 → 该排暂停 1 秒后缓起。
    const onScrollActivity = () => {
      scrollPauseUntilRef.current = performance.now() + 1000
    }
    window.addEventListener('wheel', onScrollActivity, { passive: true })
    window.addEventListener('touchmove', onScrollActivity, { passive: true })

    // 悬停检测（根因修复）：轨道处在 framer-motion 的 3D 入场变换（rotateX/rotateZ）之下，
    // 直接用 onMouseEnter/onMouseLeave 会因 3D 旋转命中测试失灵；即便改用「轨道包围盒」判定，
    // 轨道本身是 8400px 宽、且被 3D 旋转、横移位移的超大元素，其 axis-aligned 包围盒与真实
    // 命中区域严重错位 → 悬停判定飘忽。改用 document.elementFromPoint 做「浏览器真实命中测试」：
    // 取光标下方最顶层元素，若它落在这一排轨道之内（.contains），则仅暂停被悬停的那一排。
    // elementFromPoint 直接复用浏览器已完成的 3D 变换后的命中几何，天然免疫所有变换问题。
    const onMove = (e: MouseEvent) => {
      const track = trackRef.current
      if (!track) {
        hoverPausedRef.current = false
        return
      }
      const el = document.elementFromPoint(e.clientX, e.clientY)
      hoverPausedRef.current = !!(el && track.contains(el))
    }
    window.addEventListener('mousemove', onMove, { passive: true })

    const frame = (ts: number) => {
      const last = lastTsRef.current
      lastTsRef.current = ts
      const dt = last == null ? 0 : Math.min((ts - last) / 1000, 0.05)
      const W = groupWidthRef.current
      const paused = hoverPausedRef.current || performance.now() < scrollPauseUntilRef.current
      const target = paused ? 0 : baseSpeed
      // 惯性：当前速度向目标速度缓动。
      // - 暂停时衰减更快（约 0.4s 到位，仍带惯性、非瞬停），确保「悬停/滚动即停住」可读；
      // - 恢复时衰减更慢（约 0.25s 时间常数缓起），实现「缓慢恢复移动」。
      const ease = paused ? Math.min(1, dt * 10) : Math.min(1, dt * 4)
      speedRef.current += (target - speedRef.current) * ease
      // 接近静止时直接归零，杜绝残余微动（确保悬停/滚动暂停后真正停住）
      if (paused && Math.abs(speedRef.current) < 0.5) speedRef.current = 0
      if (W > 0 && Math.abs(speedRef.current) > 0.01) {
        offsetRef.current += direction * speedRef.current * dt
        let raw = offsetRef.current % W
        if (raw < 0) raw += W
        if (trackRef.current) {
          trackRef.current.style.transform = `translate3d(${-raw}px, 0, 0)`
        }
      }
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('wheel', onScrollActivity)
      window.removeEventListener('touchmove', onScrollActivity)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
    }
  }, [reducedMotion, direction, baseSpeed, hoverPausedRef])

  return { trackRef, groupRef, copies }
}

interface ShowcaseMarqueeRowProps {
  row: (typeof showcaseRows)[number]
  rowIndex: number
  direction: 1 | -1
  baseSpeed: number
  reducedMotion: boolean
}

function ShowcaseMarqueeRow({
  row,
  rowIndex,
  direction,
  baseSpeed,
  reducedMotion,
}: ShowcaseMarqueeRowProps) {
  const hoverPausedRef = useRef(false)
  const { trackRef, groupRef, copies } = useAutoMarquee({
    direction,
    baseSpeed,
    hoverPausedRef,
    reducedMotion,
  })

  return (
    <div className="mb-20">
      <span id={row.anchorId} className="block scroll-mt-24" aria-hidden="true">
        &nbsp;
      </span>
      <div
        ref={trackRef}
        className="showcase-marquee flex"
        style={{ width: 'max-content', willChange: 'transform' }}
      >
        {Array.from({ length: copies }).map((_, group) => (
          <div key={group} ref={group === 0 ? groupRef : undefined} className="flex gap-20 pr-20">
            {row.cards.map((card, cardIndex) => (
              <ShowcaseProductCard
                key={`${card.id}-${group}`}
                card={card}
                index={rowIndex * 5 + cardIndex}
                reducedMotion={reducedMotion}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 作品展示区 · 移植自 12-next-spline-3d 的 HeroParallax（EXPLORING MODERN DESIGNS）。
 * 三排卡片随滚动反向横移入场（3D 透视翻入），卡片带渐变描边 + 霓虹光晕 + 悬停上浮；
 * 每排卡片由独立的 rAF 引擎做真正无缝的自动横移（见 useAutoMarquee，根因修复版）。
 */
export function ShowcaseSection() {
  const reducedMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  const springConfig = { stiffness: 300, damping: 30, bounce: 100 }

  const rotateX = useSpring(useTransform(scrollYProgress, [0, 0.2], [15, 0]), springConfig)
  const opacity = useSpring(useTransform(scrollYProgress, [0, 0.2], [0.2, 1]), springConfig)
  const rotateZ = useSpring(useTransform(scrollYProgress, [0, 0.2], [20, 0]), springConfig)
  const translateY = useSpring(useTransform(scrollYProgress, [0, 0.2], [-700, 500]), springConfig)

  const entrance = reducedMotion
    ? undefined
    : {
        rotateX,
        rotateZ,
        translateY,
        opacity,
      }

  return (
    <section aria-label={t('showcase.titleLine2')}>
      <div
        ref={ref}
        className="relative flex h-[1500px] flex-col overflow-hidden pb-40 antialiased [perspective:1000px] [transform-style:preserve-3d] md:h-[2000px] lg:h-[2500px]"
      >
        {/* 头部：渐变大标题（HeroParallax Header 移植） */}
        <div className="relative mx-auto w-full max-w-7xl px-4 py-20 md:py-40">
          <h2 className="font-display text-4xl font-bold tracking-widest md:text-6xl">
            <span className="bg-gradient-to-r from-[#6EFFB1] to-[#A594F9] bg-clip-text text-transparent">
              {t('showcase.titleLine1')}
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#fde047] via-[#f472b6] to-[#a855f7] bg-clip-text text-5xl font-bold text-transparent md:text-6xl">
              {t('showcase.titleLine2')}
            </span>
          </h2>
          <p className="mt-8 max-w-2xl text-xl font-bold text-sky-400 md:text-2xl">
            {t('showcase.subtitle')}
          </p>
        </div>

        <motion.div style={entrance}>
          {showcaseRows.map((row, rowIndex) => (
            <ShowcaseMarqueeRow
              key={row.anchorId}
              row={row}
              rowIndex={rowIndex}
              direction={rowIndex % 2 === 0 ? -1 : 1}
              baseSpeed={50}
              reducedMotion={reducedMotion}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

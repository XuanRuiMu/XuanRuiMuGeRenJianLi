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
 * 三排共享的「暂停/缓动」控制器（根因修复核心）。
 *
 * 旧实现：每一排各自实例化一份 useAutoMarquee，悬停/滚动各自独立判定，
 * 三排的暂停状态完全独立 → 悬停一排只停一排，无法「作为一个整体一起停止、一起移动」，
 * 且 CSS animation-play-state 只能瞬停瞬起，没有惯性缓冲。
 *
 * 新实现：在 ShowcaseSection 建一个全局唯一控制器，所有排共享同一悬停集合与
 * scrollPauseUntilRef。各轨道用自身 pointerenter/pointerleave 注册悬停（边界事件，
 * 零持续开销）；wheel/touchmove 触发全局暂停 1 秒。每排 rAF 只读共享信号做
 * 帧率无关指数惯性缓动 → 三排天然同步缓停/缓起。
 */
interface MarqueeControl {
  hovered: Set<HTMLElement>
  scrollPauseUntilRef: React.MutableRefObject<number>
}

/**
 * 单排自动横移轨道。
 * 接收共享控制器：轨道注册自身悬停状态进控制器，rAF 读取共享暂停信号做惯性缓动。
 * - 速度做帧率无关的指数惯性缓动（当前速度向目标速度缓动）：
 *   - 悬停缓停 τ≈0.4s（带惯性的缓冲停止，非瞬停）；
 *   - 滚动缓停 τ≈0.18s（快速停稳，保证 1 秒暂停窗口内真正静止）；
 *   - 恢复/启动 τ≈0.7s（缓缓起步）。
 * - 全局滚动（wheel/touchmove）→ 暂停 1 秒，随后缓缓起步。
 * - 任意一排被悬停 → 三排同时缓停；全部移开 → 三排同时缓起。
 * - reduced-motion 完全静止，不注入任何 transform。
 */
function useAutoMarquee(opts: {
  control: MarqueeControl
  direction: 1 | -1
  baseSpeed: number
  reducedMotion: boolean
}) {
  const { control, direction, baseSpeed, reducedMotion } = opts
  const trackRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)
  const [copies, setCopies] = useState(2)

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

  // 轨道注册进共享控制器：自身 pointerenter/pointerleave 即全局悬停信号（边界事件，
  // 命中即整体暂停，无需每帧 mousemove 命中测试）。
  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return
    const onEnter = () => control.hovered.add(el)
    const onLeave = () => control.hovered.delete(el)
    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
      control.hovered.delete(el)
    }
  }, [control])

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

    const frame = (ts: number) => {
      const last = lastTsRef.current
      lastTsRef.current = ts
      const dt = last == null ? 0 : Math.min((ts - last) / 1000, 0.05)
      const W = groupWidthRef.current
      // 读取共享暂停信号：悬停任一排 或 全局滚动暂停窗口内 → 暂停。
      const hoverPaused = control.hovered.size > 0
      const scrollPaused = performance.now() < control.scrollPauseUntilRef.current
      const paused = hoverPaused || scrollPaused
      const target = paused ? 0 : baseSpeed
      // 帧率无关指数惯性，按触发源分取时距：
      //  - 滚动暂停：τ=0.18（约 0.5s 内停住并保持静止，确保 1 秒窗口内真正暂停）；
      //    滚动优先于悬停：滚动时用户意图是看页面，停得更快更符合预期；
      //  - 悬停缓停：τ=0.4（约 1.5s 缓停，符合「不要立刻停止」的惯性缓冲）；
      //  - 恢复/起步：τ=0.7（缓缓起步）。
      const tau = paused ? (scrollPaused ? 0.18 : 0.4) : 0.7
      const ease = 1 - Math.exp(-dt / tau)
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
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
    }
  }, [reducedMotion, direction, baseSpeed, control])

  return { trackRef, groupRef, copies }
}

interface ShowcaseMarqueeRowProps {
  row: (typeof showcaseRows)[number]
  rowIndex: number
  direction: 1 | -1
  baseSpeed: number
  reducedMotion: boolean
  control: MarqueeControl
}

function ShowcaseMarqueeRow({
  row,
  rowIndex,
  direction,
  baseSpeed,
  reducedMotion,
  control,
}: ShowcaseMarqueeRowProps) {
  const { trackRef, groupRef, copies } = useAutoMarquee({
    control,
    direction,
    baseSpeed,
    reducedMotion,
  })

  return (
    <div className="mb-20">
      <span id={row.anchorId} className="block scroll-mt-24" aria-hidden="true">
        &nbsp;
      </span>
      <div ref={trackRef} className="showcase-marquee flex">
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
 * 每排卡片由共享 rAF 引擎做真正无缝的自动横移（见 useAutoMarquee + 共享控制器，根因修复版）。
 */
export function ShowcaseSection() {
  const reducedMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  // 全局唯一共享控制器：三排共用同一悬停集合与滚动暂停信号，实现「视为整体、一起停止、一起移动」。
  const control = useRef<MarqueeControl>({
    hovered: new Set<HTMLElement>(),
    scrollPauseUntilRef: { current: 0 },
  }).current

  // 全局只挂一组滚动监听：wheel/touchmove 触发全局暂停 1 秒（悬停信号由各轨道自身边界事件注册）。
  useEffect(() => {
    const onScrollActivity = () => {
      control.scrollPauseUntilRef.current = performance.now() + 1000
    }
    window.addEventListener('wheel', onScrollActivity, { passive: true })
    window.addEventListener('touchmove', onScrollActivity, { passive: true })
    return () => {
      window.removeEventListener('wheel', onScrollActivity)
      window.removeEventListener('touchmove', onScrollActivity)
      control.hovered.clear()
    }
  }, [control])

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
              control={control}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

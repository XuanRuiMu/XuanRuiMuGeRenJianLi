import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  GraduationCap,
  Code2,
  Network,
  Database,
  Users,
  Cpu,
  Microchip,
  Landmark,
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
  FolderGit2,
  GitBranch,
  type LucideIcon,
} from 'lucide-react'
import { motion, useScroll, useSpring, useTransform, type MotionStyle } from 'framer-motion'
import { showcaseRows, type ShowcaseCard } from '../../data/showcase'
import { t } from '../../i18n/translations'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import {
  创建跑马灯控制,
  计算份数,
  是否滚动按键,
  归一化位移,
  钳制滚动增量,
  推进一帧,
  标记意图滚动,
  同步滚动位置,
  最大帧步长,
  type 跑马灯控制,
  type 轨道槽位,
} from './marqueeEngine'

const CARD_ICONS: Record<string, LucideIcon> = {
  degree: GraduationCap,
  coding: Code2,
  systems: Network,
  lowlevel: Database,
  teaching: Users,
  assembly: Cpu,
  arch: Microchip,
  marx: Landmark,
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
  fenglai: Gamepad2,
  repoLoop: FolderGit2,
  repoLove: GitBranch,
  repoData: Database,
}

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

const ICON_COLORS = ['#a78bfa', '#fbbf24', '#f472b6', '#22d3ee', '#a3e635', '#e879f9', '#facc15', '#60a5fa', '#34d399']

const 弹簧配置 = { stiffness: 300, damping: 30 }

interface ShowcaseProductCardProps {
  card: ShowcaseCard
  index: number
  reducedMotion: boolean
  控制?: 跑马灯控制
  视差?: MotionStyle
}

function ShowcaseProductCard({ card, index, reducedMotion, 控制, 视差 }: ShowcaseProductCardProps) {
  const gradient = GRADIENTS[index % GRADIENTS.length]
  const neonShadow = NEON_SHADOWS[index % NEON_SHADOWS.length]
  const iconColor = ICON_COLORS[index % ICON_COLORS.length]
  const Icon = CARD_ICONS[card.id] ?? Shapes
  const cardRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el || !控制 || reducedMotion) return
    const onEnter = () => 控制.悬停集合.add(el)
    const onLeave = () => 控制.悬停集合.delete(el)
    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
      控制.悬停集合.delete(el)
    }
  }, [控制, reducedMotion])

  const 有配图 = Boolean(card.image)

  const inner = (
    <div
      className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-xl bg-black p-5 md:p-6"
      style={
        有配图
          ? {
              backgroundImage: `url(${card.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      {有配图 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-t from-black/90 via-black/50 to-black/70"
        />
      )}
      <div className="relative z-10 flex h-full w-full flex-col justify-between">
        <Icon size={44} style={{ color: iconColor }} aria-hidden="true" />
        <div>
          <h3 className="mb-1.5 text-base font-bold text-white md:text-lg">{t(card.titleKey)}</h3>
          <p className="text-xs leading-relaxed text-[#aaa6c3] md:text-sm">{t(card.descKey)}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div
      ref={cardRef}
      className="group/card relative h-32 w-[11rem] shrink-0 md:h-[26.75rem] md:w-[22rem] lg:h-96 lg:w-[30rem]"
    >
      <span aria-hidden="true" className="absolute inset-x-0 -bottom-6 h-6" />
      <motion.div style={视差} whileHover={reducedMotion ? undefined : { y: -20 }} className="h-full w-full">
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

function useZidongPaomadeng(选项: { 控制: 跑马灯控制; 方向: 1 | -1; 基准速度: number; 减少动画: boolean }) {
  const { 控制, 方向, 基准速度, 减少动画 } = 选项
  const 轨道Ref = useRef<HTMLDivElement>(null)
  const 组Ref = useRef<HTMLDivElement>(null)
  const 周期Ref = useRef(0)
  const 位移Ref = useRef(0)
  const 速度Ref = useRef(0)
  const [份数, 设置份数] = useState(2)

  useLayoutEffect(() => {
    if (减少动画) {
      if (轨道Ref.current) 轨道Ref.current.style.transform = ''
      return
    }
    let 已调度 = false
    const 执行测量 = () => {
      已调度 = false
      const 组 = 组Ref.current
      if (!组) return
      const 组宽 = 组.offsetWidth
      if (!(组宽 > 0)) return
      const 轨道元素 = 轨道Ref.current
      const 视口元素 = 轨道元素?.parentElement
      const 视口宽 = 视口元素?.clientWidth || window.innerWidth || document.documentElement.clientWidth || 0
      设置份数((旧份数) => {
        const 目标份数 = 计算份数(视口宽, 组宽)
        return 旧份数 === 目标份数 ? 旧份数 : 目标份数
      })
      if (组宽 !== 周期Ref.current) {
        周期Ref.current = 组宽
        位移Ref.current = 归一化位移(位移Ref.current, 组宽)
        if (轨道元素) 轨道元素.style.transform = `translate3d(${-位移Ref.current}px, 0, 0)`
      }
    }
    const 调度测量 = () => {
      if (已调度) return
      已调度 = true
      requestAnimationFrame(执行测量)
    }
    执行测量()
    let 观察器: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && 组Ref.current) {
      观察器 = new ResizeObserver(调度测量)
      观察器.observe(组Ref.current)
    }
    window.addEventListener('resize', 调度测量)
    window.addEventListener('load', 调度测量)
    const 字体集 = document.fonts
    if (字体集 && typeof 字体集.ready?.then === 'function') {
      void 字体集.ready.then(调度测量)
    }
    return () => {
      观察器?.disconnect()
      window.removeEventListener('resize', 调度测量)
      window.removeEventListener('load', 调度测量)
    }
  }, [减少动画])

  useEffect(() => {
    if (减少动画) return
    const 槽位: 轨道槽位 = {
      轨道: 轨道Ref,
      周期: 周期Ref,
      位移: 位移Ref,
      速度: 速度Ref,
      方向,
      基准速度,
    }
    控制.轨道表.push(槽位)
    return () => {
      const 下标 = 控制.轨道表.indexOf(槽位)
      if (下标 >= 0) 控制.轨道表.splice(下标, 1)
    }
  }, [控制, 方向, 基准速度, 减少动画])

  return { 轨道Ref, 组Ref, 份数 }
}

interface ShowcaseMarqueeRowProps {
  row: (typeof showcaseRows)[number]
  rowIndex: number
  方向: 1 | -1
  基准速度: number
  减少动画: boolean
  控制: 跑马灯控制
  视差?: MotionStyle
}

function ShowcaseMarqueeRow({ row, rowIndex, 方向, 基准速度, 减少动画, 控制, 视差 }: ShowcaseMarqueeRowProps) {
  const { 轨道Ref, 组Ref, 份数 } = useZidongPaomadeng({
    控制,
    方向,
    基准速度,
    减少动画,
  })

  return (
    <div className="mb-20">
      <span id={row.anchorId} className="block scroll-mt-24" aria-hidden="true">
        &nbsp;
      </span>
      <div className="showcase-marquee-viewport relative w-full overflow-hidden">
        <div ref={轨道Ref} className="showcase-marquee flex">
          {Array.from({ length: 份数 }).map((_, group) => (
            <div key={group} ref={group === 0 ? 组Ref : undefined} className="flex shrink-0 gap-20 pr-20">
              {row.cards.map((card, cardIndex) => (
                <ShowcaseProductCard
                  key={`${card.id}-${group}`}
                  card={card}
                  index={rowIndex * 5 + cardIndex}
                  reducedMotion={减少动画}
                  控制={控制}
                  视差={视差}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ShowcaseSection() {
  const reducedMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  const [控制] = useState(创建跑马灯控制)

  useEffect(() => {
    const 意图输入 = () => 标记意图滚动(控制)
    const 缓冲同步 = () => 同步滚动位置(控制)
    const 按键暂停 = (事件: KeyboardEvent) => {
      if (是否滚动按键(事件.key)) 标记意图滚动(控制)
    }
    window.addEventListener('wheel', 意图输入, { passive: true })
    window.addEventListener('touchmove', 意图输入, { passive: true })
    window.addEventListener('scroll', 缓冲同步, { passive: true })
    window.addEventListener('keydown', 按键暂停)
    return () => {
      window.removeEventListener('wheel', 意图输入)
      window.removeEventListener('touchmove', 意图输入)
      window.removeEventListener('scroll', 缓冲同步)
      window.removeEventListener('keydown', 按键暂停)
      控制.悬停集合.clear()
    }
  }, [控制])

  useEffect(() => {
    if (reducedMotion) return
    let 帧号 = 0
    let 上次时刻: number | null = null
    const 帧 = (时刻: number) => {
      const 上次 = 上次时刻
      上次时刻 = 时刻
      const 步长秒 = 上次 == null ? 0 : Math.min(Math.max((时刻 - 上次) / 1000, 0), 最大帧步长)
      const 悬停暂停 = 控制.悬停集合.size > 0
      const 滚动暂停中 = performance.now() < 控制.暂停至.current
      const 已暂停 = 悬停暂停 || 滚动暂停中
      const 滚动增量 = 钳制滚动增量(控制.滚动位置.current - 控制.上次滚动位置.current)
      控制.上次滚动位置.current = 控制.滚动位置.current
      for (const 槽位 of 控制.轨道表) {
        const 结果 = 推进一帧({
          位移: 槽位.位移.current,
          速度: 槽位.速度.current,
          周期: 槽位.周期.current,
          方向: 槽位.方向,
          基准速度: 槽位.基准速度,
          已暂停,
          滚动暂停中,
          步长秒,
          滚动增量,
        })
        槽位.速度.current = 结果.速度
        if (结果.位移 !== 槽位.位移.current) {
          槽位.位移.current = 结果.位移
          const 轨道 = 槽位.轨道.current
          if (轨道) 轨道.style.transform = `translate3d(${-结果.位移}px, 0, 0)`
        }
      }
      帧号 = requestAnimationFrame(帧)
    }
    帧号 = requestAnimationFrame(帧)
    return () => cancelAnimationFrame(帧号)
  }, [reducedMotion, 控制])

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  const rotateX = useSpring(useTransform(scrollYProgress, [0, 0.2], [15, 0]), 弹簧配置)
  const rotateZ = useSpring(useTransform(scrollYProgress, [0, 0.2], [20, 0]), 弹簧配置)

  const entrance = reducedMotion
    ? undefined
    : {
        rotateX,
        rotateZ,
      }

  return (
    <section data-showcase="true" aria-label={t('showcase.titleLine2')}>
      <div
        ref={ref}
        className="relative z-[100] isolate flex min-h-0 flex-col pb-24 antialiased [perspective:1000px] md:pb-28"
      >
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
          <p className="mt-8 max-w-2xl text-xl font-bold text-sky-400 md:text-2xl">{t('showcase.subtitle')}</p>
        </div>

        <div className="[perspective:1000px]">
          {showcaseRows.map((row, rowIndex) => (
            <ShowcaseMarqueeRow
              key={row.anchorId}
              row={row}
              rowIndex={rowIndex}
              方向={rowIndex % 2 === 0 ? -1 : 1}
              基准速度={50}
              减少动画={reducedMotion}
              控制={控制}
              视差={entrance}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

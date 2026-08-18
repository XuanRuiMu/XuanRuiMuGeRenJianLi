import { useRef } from 'react'
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
import { motion, useScroll, useTransform, useSpring, type MotionValue } from 'framer-motion'
import { showcaseRows, type ShowcaseCard } from '../../data/showcase'
import { t } from '../../i18n/translations'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { cn } from '../../lib/utils'

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
  translate: MotionValue<number>
  index: number
  reducedMotion: boolean
}

function ShowcaseProductCard({ card, translate, index, reducedMotion }: ShowcaseProductCardProps) {
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
        style={reducedMotion ? undefined : { x: translate }}
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
 * 作品展示区 · 移植自 12-next-spline-3d 的 HeroParallax（EXPLORING MODERN DESIGNS）。
 * 三排卡片随滚动反向横移，整组以 3D 透视（rotateX/rotateZ/translateY/opacity）翻转入场；
 * 卡片带渐变描边 + 霓虹光晕 + 悬停上浮。板块标签已移除，仅保留纯粹的方块项目；
 * 卡片另以 card-drift 关键帧做轻微自动悬浮（不干扰滚动驱动位移）。
 */
export function ShowcaseSection() {
  const reducedMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  const springConfig = { stiffness: 300, damping: 30, bounce: 100 }

  const translateX = useSpring(useTransform(scrollYProgress, [0, 1], [0, 1000]), springConfig)
  const translateXReverse = useSpring(useTransform(scrollYProgress, [0, 1], [0, -1000]), springConfig)
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
          {showcaseRows.map((row, rowIndex) => {
            const reversed = rowIndex % 2 === 0
            const translate = reversed ? translateX : translateXReverse
            return (
              <div key={row.anchorId} className="mb-20">
                <span id={row.anchorId} className="block scroll-mt-24" aria-hidden="true">
                  &nbsp;
                </span>
                {/* 自主横移轨道：渲染两份相同卡片组，translateX(-50%) 无缝循环；
                    方向与该排滚动视差一致（偶数排右、奇数排左），模拟向下划动网页。 */}
                <motion.div
                  className={cn(
                    'showcase-marquee',
                    reversed
                      ? 'showcase-marquee--right flex flex-row-reverse'
                      : 'showcase-marquee--left flex flex-row'
                  )}
                >
                  {[0, 1].map((group) => (
                    <div key={group} className="flex gap-20 pr-20">
                      {row.cards.map((card, cardIndex) => (
                        <ShowcaseProductCard
                          key={`${card.id}-${group}`}
                          card={card}
                          translate={translate}
                          index={rowIndex * 5 + cardIndex}
                          reducedMotion={reducedMotion}
                        />
                      ))}
                    </div>
                  ))}
                </motion.div>
              </div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

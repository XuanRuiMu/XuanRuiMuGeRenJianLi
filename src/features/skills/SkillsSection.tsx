import { useEffect, useId, useRef, useState } from 'react'
import { Section } from '../../components/ui/Section'
import { Reveal } from '../../components/Reveal'
import { t } from '../../i18n/translations'
import {
  radarAxes,
  dimensionLabelKey,
  dimensionBasisKey,
  dimensionDescriptionKey,
  type RadarAxis,
} from '../../data/radar'
import { 量化指标, 技能组表, type 量化指标项 } from '../../data/skillGroups'
import { useCountUp } from '../../hooks/useCountUp'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { AnimatePresence, motion } from 'framer-motion'

const SIZE = 320
const CENTER = SIZE / 2
const RADIUS = 116
const RINGS = [20, 40, 60, 80, 100]
/** 轴标签画在 1.18 倍半径处，文字本身还会向外延伸；viewBox 若只容下 SIZE 就会裁掉侧向标签。 */
const 标签留白 = 44
const 画布起点X = -标签留白
const 画布起点Y = -标签留白 / 2
const 画布宽度 = SIZE + 标签留白 * 2
const 画布高度 = SIZE + 标签留白
const 画布 = `${画布起点X} ${画布起点Y} ${画布宽度} ${画布高度}`
/** 指标数字滚动时长（ms） */
const 指标滚动时长 = 1280
const 气泡进入毫秒 = 200
const 气泡退出毫秒 = 120

function pointAt(angleDeg: number, ratio: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  const r = RADIUS * ratio
  return [CENTER + r * Math.cos(rad), CENTER + r * Math.sin(rad)]
}

function polygonPoints(levels: number[]): string {
  const step = 360 / levels.length
  return levels
    .map((lv, i) => {
      const [x, y] = pointAt(i * step, lv / 100)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

interface 气泡视觉 {
  形状: string
  色调: 'technical' | 'creative'
  方位: string
  引导X: number
  引导Y: number
  定位类: string
  边框类: string
  底色类: string
  强调类: string
  文字强调类: string
}

const 气泡视觉表: Record<string, 气泡视觉> = {
  aiAgent: {
    形状: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))',
    色调: 'technical',
    方位: 'top-point-below',
    引导X: 0,
    引导Y: 16,
    定位类: '-translate-x-1/2',
    边框类: 'border-primary/50',
    底色类: 'bg-primary/[0.07]',
    强调类: 'bg-primary',
    文字强调类: 'text-primary',
  },
  backendArchitecture: {
    形状: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)',
    色调: 'technical',
    方位: 'upper-left',
    引导X: -16,
    引导Y: -16,
    定位类: '-translate-x-full -translate-y-full max-md:-translate-x-1/2',
    边框类: 'border-sky-400/45',
    底色类: 'bg-sky-400/[0.07]',
    强调类: 'bg-sky-400',
    文字强调类: 'text-sky-300',
  },
  fullStack: {
    形状: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
    色调: 'technical',
    方位: 'lower-left',
    引导X: -16,
    引导Y: 16,
    定位类: '-translate-x-full max-md:-translate-x-1/2',
    边框类: 'border-cyan-300/45',
    底色类: 'bg-cyan-300/[0.07]',
    强调类: 'bg-cyan-300',
    文字强调类: 'text-cyan-200',
  },
  devopsDelivery: {
    形状: 'polygon(0 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%)',
    色调: 'technical',
    方位: 'below',
    引导X: 0,
    引导Y: 16,
    定位类: '-translate-x-1/2',
    边框类: 'border-indigo-300/45',
    底色类: 'bg-indigo-300/[0.07]',
    强调类: 'bg-indigo-300',
    文字强调类: 'text-indigo-200',
  },
  designAesthetic: {
    形状: 'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)',
    色调: 'creative',
    方位: 'above',
    引导X: 0,
    引导Y: -16,
    定位类: '-translate-x-1/2 -translate-y-full',
    边框类: 'border-secondary/50',
    底色类: 'bg-secondary/[0.08]',
    强调类: 'bg-secondary',
    文字强调类: 'text-secondary',
  },
  artCreation: {
    形状: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
    色调: 'creative',
    方位: 'lower-right',
    引导X: 12,
    引导Y: 12,
    定位类: 'translate-x-0 translate-y-0',
    边框类: 'border-accent/50',
    底色类: 'bg-accent/[0.08]',
    强调类: 'bg-accent',
    文字强调类: 'text-accent',
  },
}

function SkillMetricCard({ 指标, 启动, 动画 }: { 指标: 量化指标项; 启动: boolean; 动画: boolean }) {
  const { display } = useCountUp({
    value: 指标.value,
    durationMs: 指标滚动时长,
    enabled: 动画,
    start: 启动,
    zeroUntilStart: true,
  })
  return (
    <div data-skill-metric={指标.id} className="rounded-xl border border-border/60 bg-surface/40 px-4 py-4 text-center">
      <div className="font-display text-2xl font-bold tabular-nums text-primary text-shadow-readable">{display}</div>
      <div className="mt-1 text-xs text-muted">{指标.label}</div>
    </div>
  )
}

function RadarTooltip({
  轴,
  x,
  y,
  说明Id,
  减少动画,
}: {
  轴: RadarAxis
  x: number
  y: number
  说明Id: string
  减少动画: boolean
}) {
  const 视觉 = 气泡视觉表[轴.id] ?? 气泡视觉表.aiAgent
  const 锚点X = x + 视觉.引导X
  const 锚点Y = y + 视觉.引导Y
  const left = `${((锚点X - 画布起点X) / 画布宽度) * 100}%`
  const top = `${((锚点Y - 画布起点Y) / 画布高度) * 100}%`
  return (
    <div
      data-radar-placement={视觉.方位}
      className={['pointer-events-none absolute z-20 w-48', 视觉.定位类].join(' ')}
      style={{ left, top }}
    >
      <motion.div
        id={说明Id}
        role="tooltip"
        data-radar-tooltip={轴.id}
        data-radar-shape={轴.id}
        data-radar-tone={视觉.色调}
        data-motion-enter-ms={气泡进入毫秒}
        data-motion-exit-ms={气泡退出毫秒}
        data-reduced-motion={减少动画 ? 'true' : 'false'}
        initial={{ opacity: 减少动画 ? 1 : 0, scale: 减少动画 ? 1 : 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{
          opacity: 0,
          scale: 减少动画 ? 1 : 0.98,
          transition: { duration: 减少动画 ? 0 : 气泡退出毫秒 / 1000 },
        }}
        transition={{
          duration: 减少动画 ? 0 : 气泡进入毫秒 / 1000,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={[
          'relative w-full overflow-hidden border bg-panel/95 px-4 py-3.5 shadow-2xl backdrop-blur-md',
          'drop-shadow-[0_18px_28px_rgba(0,0,0,0.28)]',
          视觉.边框类,
        ].join(' ')}
        style={{ clipPath: 视觉.形状 }}
      >
        <span aria-hidden="true" className={['absolute inset-0', 视觉.底色类].join(' ')} />
        <span aria-hidden="true" className={['absolute inset-y-0 left-0 w-0.5', 视觉.强调类].join(' ')} />
        <div className="relative text-[13px] leading-6 text-text-secondary">{t(dimensionDescriptionKey(轴.id))}</div>
      </motion.div>
    </div>
  )
}

export function SkillsSection() {
  const reduced = useReducedMotion()
  const count = radarAxes.length
  const dataPoints = polygonPoints(radarAxes.map((a) => a.level))
  const 指标表 = 量化指标()
  const 分组表 = 技能组表()
  const 主轴表 = radarAxes.filter((轴) => !轴.minor)
  const 气泡说明Id = useId()
  const [悬停轴Id, set悬停轴Id] = useState<string | null>(null)
  const 当前轴Id = 悬停轴Id
  const 当前轴索引 = radarAxes.findIndex((轴) => 轴.id === 当前轴Id)
  const 当前轴 = 当前轴索引 >= 0 ? radarAxes[当前轴索引] : null
  const 当前视觉 = 当前轴 ? 气泡视觉表[当前轴.id] : undefined
  const 当前说明Id = 当前轴 ? `${气泡说明Id}-${当前轴.id}` : 气泡说明Id
  const [当前X, 当前Y] = 当前轴索引 >= 0 ? pointAt(当前轴索引 * (360 / count), (当前轴?.level ?? 0) / 100) : [0, 0]

  const 指标区引用 = useRef<HTMLDivElement>(null)
  const [进入视口, set进入视口] = useState(false)
  useEffect(() => {
    const 元素 = 指标区引用.current
    if (!元素) return
    if (typeof IntersectionObserver === 'undefined') {
      queueMicrotask(() => set进入视口(true))
      return
    }
    const 观察器 = new IntersectionObserver(
      ([条目]) => {
        if (条目.isIntersecting) {
          set进入视口(true)
          观察器.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    观察器.observe(元素)
    return () => 观察器.disconnect()
  }, [指标区引用])

  return (
    <Section id="skills" title={t('skills.title')}>
      <div ref={指标区引用} data-skill-metrics="true" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {指标表.map((指标) => (
          <SkillMetricCard key={指标.id} 指标={指标} 启动={进入视口} 动画={!reduced} />
        ))}
      </div>

      <div className="mt-10">
        <h3 className="mb-4 text-sm font-medium text-text-primary text-shadow-readable">{t('skills.groupsTitle')}</h3>
        <div className="grid gap-5 md:grid-cols-2">
          {分组表.map((组) => (
            <Reveal key={组.id}>
              <div data-skill-group={组.id} className="h-full rounded-2xl border border-border/60 bg-surface/40 p-5">
                <h4 className="text-base font-medium text-text-primary">{组.label}</h4>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">{组.description}</p>
                <ul className="mt-3 space-y-2">
                  {组.items.map((陈述) => (
                    <li key={陈述} className="flex gap-2 text-sm leading-relaxed text-text-secondary">
                      <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      <span>{陈述}</span>
                    </li>
                  ))}
                </ul>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {组.tags.map((标签) => (
                    <li
                      key={标签}
                      data-skill-tag={标签}
                      className="rounded-full border border-border/60 px-2.5 py-0.5 font-mono text-xs text-primary"
                    >
                      {标签}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="mt-12 grid items-start gap-10 md:grid-cols-2">
        <Reveal className="flex justify-center">
          <figure className="relative w-full max-w-sm">
            <figcaption className="mb-3 text-center text-sm font-medium text-muted">
              {t('skills.radarTitle')}
            </figcaption>
            <div
              data-radar-overlay="true"
              className="relative w-full overflow-visible"
              // 兜底清除：双击拖选等浏览器指针捕获场景会抑制小圆点自身的 mouseleave，
              // 导致悬浮窗残留。指针只要离开整个雷达图区域就强制清空，悬浮窗只可能由悬停驱动。
              onPointerLeave={() => set悬停轴Id(null)}
            >
              <svg viewBox={画布} className="block h-auto w-full" role="group" aria-label={t('skills.radarTitle')}>
                {RINGS.map((lv) => (
                  <polygon
                    key={lv}
                    points={polygonPoints(radarAxes.map(() => lv))}
                    fill="none"
                    stroke="rgba(125,211,252,0.18)"
                    strokeWidth={1}
                  />
                ))}
                {radarAxes.map((_, i) => {
                  const [x, y] = pointAt(i * (360 / count), 1)
                  return (
                    <line
                      key={i}
                      x1={CENTER}
                      y1={CENTER}
                      x2={x}
                      y2={y}
                      stroke="rgba(125,211,252,0.18)"
                      strokeWidth={1}
                    />
                  )
                })}
                <polygon
                  points={dataPoints}
                  fill="rgba(56,189,248,0.25)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  style={reduced ? undefined : { transition: 'all 700ms ease' }}
                />
                <AnimatePresence initial={false}>
                  {当前轴 && 当前视觉 && (
                    <motion.line
                      key={`connector-${当前轴.id}`}
                      data-radar-connector={当前轴.id}
                      x1={当前X}
                      y1={当前Y}
                      x2={当前X + 当前视觉.引导X}
                      y2={当前Y + 当前视觉.引导Y}
                      stroke="currentColor"
                      strokeWidth={1.4}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      className={当前视觉.文字强调类}
                      initial={{ pathLength: reduced ? 1 : 0, opacity: reduced ? 1 : 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      exit={{
                        opacity: 0,
                        transition: { duration: reduced ? 0 : 气泡退出毫秒 / 1000 },
                      }}
                      transition={{
                        duration: reduced ? 0 : 气泡进入毫秒 / 1000,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                  )}
                </AnimatePresence>
                {radarAxes.map((轴, i) => {
                  const [x, y] = pointAt(i * (360 / count), 轴.level / 100)
                  return (
                    <circle
                      key={轴.id}
                      data-radar-point={轴.id}
                      cx={x}
                      cy={y}
                      r={当前轴?.id === 轴.id ? 5 : 3}
                      fill="#38bdf8"
                      className="cursor-default"
                      onMouseEnter={() => set悬停轴Id(轴.id)}
                      onMouseLeave={() => set悬停轴Id(null)}
                      role="img"
                      aria-label={t(dimensionLabelKey(轴.id))}
                    />
                  )
                })}
                {radarAxes.map((轴, i) => {
                  const [x, y] = pointAt(i * (360 / count), 1.18)
                  const anchor = x < CENTER - 4 ? 'end' : x > CENTER + 4 ? 'start' : 'middle'
                  return (
                    <text
                      key={轴.id}
                      x={x}
                      y={y}
                      textAnchor={anchor}
                      dominantBaseline="middle"
                      className="fill-current text-text-secondary"
                      style={{ fontSize: 11 }}
                    >
                      {t(dimensionLabelKey(轴.id))}
                    </text>
                  )
                })}
              </svg>
              <AnimatePresence initial={false}>
                {当前轴 && (
                  <RadarTooltip
                    key={当前轴.id}
                    轴={当前轴}
                    x={当前X}
                    y={当前Y}
                    说明Id={当前说明Id}
                    减少动画={reduced}
                  />
                )}
              </AnimatePresence>
            </div>
          </figure>
        </Reveal>

        {/* 图例只列主轴；附轴（设计/艺术）仅在雷达上，悬停浮窗看说明 */}
        <div className="space-y-3">
          {主轴表.map((轴) => (
            <Reveal key={轴.id}>
              <div className="rounded-xl border border-border/60 bg-surface/40 p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-text-primary">{t(dimensionLabelKey(轴.id))}</span>
                  <span className="font-mono text-xs text-primary">{轴.level}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">{t(dimensionBasisKey(轴.id))}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}

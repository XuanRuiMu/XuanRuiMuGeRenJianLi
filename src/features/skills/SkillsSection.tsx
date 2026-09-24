import { useEffect, useRef, useState } from 'react'
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

const SIZE = 320
const CENTER = SIZE / 2
const RADIUS = 116
const RINGS = [20, 40, 60, 80, 100]
/** 轴标签画在 1.18 倍半径处，文字本身还会向外延伸；viewBox 若只容下 SIZE 就会裁掉侧向标签。 */
const 标签留白 = 44
const 画布 = `${-标签留白} ${-标签留白 / 2} ${SIZE + 标签留白 * 2} ${SIZE + 标签留白}`
/** 指标数字滚动时长（ms） */
const 指标滚动时长 = 640

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

/** 雷达节点悬停浮窗：定位在节点右上，超出画布时自动翻边 */
function RadarTooltip({ 轴, x, y }: { 轴: RadarAxis; x: number; y: number }) {
  const 翻边 = x > CENTER
  const top = Math.max(0, y - 12)
  const left = 翻边 ? undefined : Math.min(x + 14, SIZE + 标签留白 - 8)
  const right = 翻边 ? SIZE + 标签留白 - x + 14 : undefined
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 w-52 rounded-lg border border-border bg-panel px-3 py-2 shadow-lg"
      style={{ top, left, right }}
    >
      <div className="text-sm font-semibold text-text-primary">{t(dimensionLabelKey(轴.id))}</div>
      <div className="mt-0.5 text-xs leading-relaxed text-text-secondary">{t(dimensionDescriptionKey(轴.id))}</div>
      <div className="mt-1 text-[11px] leading-relaxed text-muted">{t(dimensionBasisKey(轴.id))}</div>
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
  const [悬停轴, set悬停轴] = useState<{ 轴: RadarAxis; x: number; y: number } | null>(null)

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
            <svg viewBox={画布} className="h-auto w-full" role="img" aria-label={t('skills.radarTitle')}>
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
                  <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="rgba(125,211,252,0.18)" strokeWidth={1} />
                )
              })}
              <polygon
                points={dataPoints}
                fill="rgba(56,189,248,0.25)"
                stroke="#38bdf8"
                strokeWidth={2}
                style={reduced ? undefined : { transition: 'all 700ms ease' }}
              />
              {radarAxes.map((轴, i) => {
                const [x, y] = pointAt(i * (360 / count), 轴.level / 100)
                return (
                  <circle
                    key={轴.id}
                    cx={x}
                    cy={y}
                    r={悬停轴?.轴.id === 轴.id ? 5 : 3}
                    fill={轴.minor ? '#a78bfa' : '#38bdf8'}
                    className="cursor-pointer"
                    onMouseEnter={() => set悬停轴({ 轴, x, y })}
                    onMouseLeave={() => set悬停轴(null)}
                    onFocus={() => set悬停轴({ 轴, x, y })}
                    onBlur={() => set悬停轴(null)}
                    tabIndex={0}
                    role="button"
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
            {悬停轴 && <RadarTooltip 轴={悬停轴.轴} x={悬停轴.x} y={悬停轴.y} />}
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

import { Section } from '../../components/ui/Section'
import { Reveal } from '../../components/Reveal'
import { t, type TranslationKey } from '../../i18n/translations'
import { radarAxes, dimensionLabelKey, dimensionBasisKey } from '../../data/radar'
import { useReducedMotion } from '../../hooks/useReducedMotion'

const SIZE = 320
const CENTER = SIZE / 2
const RADIUS = 116
const RINGS = [20, 40, 60, 80, 100]

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

export function SkillsSection() {
  const reduced = useReducedMotion()
  const count = radarAxes.length
  const dataPoints = polygonPoints(radarAxes.map((a) => a.level))

  return (
    <Section id="skills" title={t('skills.title')} subtitle={t('skills.subtitle')}>
      <div className="grid items-start gap-10 md:grid-cols-2">
        {/* 雷达图 */}
        <Reveal className="flex justify-center">
          <figure className="w-full max-w-sm">
            <figcaption className="mb-3 text-center text-sm font-medium text-muted">
              {t('skills.radarTitle')}
            </figcaption>
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="h-auto w-full"
              role="img"
              aria-label={t('skills.radarTitle')}
            >
              {/* 网格环 */}
              {RINGS.map((lv) => (
                <polygon
                  key={lv}
                  points={polygonPoints(radarAxes.map(() => lv))}
                  fill="none"
                  stroke="rgba(125,211,252,0.18)"
                  strokeWidth={1}
                />
              ))}
              {/* 轴线 */}
              {radarAxes.map((_, i) => {
                const [x, y] = pointAt(i * (360 / count), 1)
                return (
                  <line key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="rgba(125,211,252,0.18)" strokeWidth={1} />
                )
              })}
              {/* 数据多边形 */}
              <polygon
                points={dataPoints}
                fill="rgba(56,189,248,0.25)"
                stroke="#38bdf8"
                strokeWidth={2}
                style={reduced ? undefined : { transition: 'all 700ms ease' }}
              />
              {/* 数据点 */}
              {radarAxes.map((a, i) => {
                const [x, y] = pointAt(i * (360 / count), a.level / 100)
                return <circle key={i} cx={x} cy={y} r={3} fill="#38bdf8" />
              })}
              {/* 轴标签 */}
              {radarAxes.map((a, i) => {
                const [x, y] = pointAt(i * (360 / count), 1.18)
                const anchor = x < CENTER - 4 ? 'end' : x > CENTER + 4 ? 'start' : 'middle'
                return (
                  <text
                    key={i}
                    x={x}
                    y={y}
                    textAnchor={anchor}
                    dominantBaseline="middle"
                    className="fill-current text-text-secondary"
                    style={{ fontSize: 11 }}
                  >
                    {t(dimensionLabelKey(a.id))}
                  </text>
                )
              })}
            </svg>
          </figure>
        </Reveal>

        {/* 图例 + 真实依据 */}
        <div className="space-y-3">
          {radarAxes.map((a) => (
            <Reveal key={a.id}>
              <div className="rounded-xl border border-border/60 bg-surface/40 p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-text-primary">{t(dimensionLabelKey(a.id))}</span>
                  <span className="font-mono text-xs text-primary">{a.level}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">{t(dimensionBasisKey(a.id))}</p>
              </div>
            </Reveal>
          ))}
          <p className="text-xs text-muted">{t('skills.radarNote' as TranslationKey)}</p>
        </div>
      </div>
    </Section>
  )
}

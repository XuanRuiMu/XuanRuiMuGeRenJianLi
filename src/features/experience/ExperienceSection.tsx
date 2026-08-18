import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Gamepad2, GitPullRequest, GraduationCap, Clapperboard, type LucideIcon } from 'lucide-react'
import { experiences } from '../../data/experience'
import { Section } from '../../components/ui/Section'
import { Card } from '../../components/ui/Card'
import { t } from '../../i18n/translations'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useCountUp } from '../../hooks/useCountUp'

const TIMELINE_PROGRESS_VAR = '--timeline-progress'

/** 各经历的图标与主题色（色值取自 02-react-three-fiber 卡片配色体系） */
const ENTRY_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  xrm: { icon: Gamepad2, color: '#00cea8' },
  openSource: { icon: GitPullRequest, color: '#bf61ff' },
  teacher: { icon: GraduationCap, color: '#38ef7d' },
  multimedia: { icon: Clapperboard, color: '#56ccf2' },
}

/** 成就条目循环使用 8102 的蓝/绿/粉渐变文字 */
const ACHIEVEMENT_GRADIENTS = ['text-gradient-blue', 'text-gradient-green', 'text-gradient-pink']

/** 滚动驱动进度（0–1）：设置 CSS 变量供 ::after 发光使用，并维护 React 状态驱动 SVG 填充；同时激活节点。 */
function useTimelineProgress(ref: React.RefObject<HTMLElement | null>, count: number): number {
  const prefersReducedMotion = useReducedMotion()
  const [progress, setProgress] = useState(prefersReducedMotion ? 1 : 0)

  useEffect(() => {
    if (prefersReducedMotion || !ref.current) {
      setProgress(1)
      return
    }

    const element = ref.current
    let rafId = 0
    let lastProgress = -1

    const nodes = Array.from(element.querySelectorAll<HTMLElement>('[data-timeline-index] .timeline-node'))

    const updateProgress = () => {
      const rect = element.getBoundingClientRect()
      const viewportCenter = window.innerHeight * 0.5
      const timelineHeight = rect.height
      const ratio = timelineHeight > 0 ? Math.min(1, Math.max(0, (viewportCenter - rect.top) / timelineHeight)) : 0

      if (Math.abs(ratio - lastProgress) > 0.005) {
        lastProgress = ratio
        element.style.setProperty(TIMELINE_PROGRESS_VAR, String(ratio))
        setProgress(ratio)
      }

      for (const node of nodes) {
        const nodeRect = node.getBoundingClientRect()
        const nodeCenter = nodeRect.top + nodeRect.height * 0.5
        const nodeRatio = timelineHeight > 0 ? Math.min(1, Math.max(0, (nodeCenter - rect.top) / timelineHeight)) : 0
        node.classList.toggle('is-active', ratio >= nodeRatio)
      }

      rafId = 0
    }

    const handleScroll = () => {
      if (rafId) return
      rafId = requestAnimationFrame(updateProgress)
    }

    updateProgress()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [prefersReducedMotion, ref, count])

  return progress
}

function useTimelineItems(count: number) {
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) return

    const observers: IntersectionObserver[] = []

    for (let index = 0; index < count; index++) {
      const element = document.querySelector(`[data-timeline-index="${index}"]`)
      if (!element) continue

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            element.classList.add('is-visible')
            observer.disconnect()
          }
        },
        { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
      )
      observer.observe(element)
      observers.push(observer)
    }

    return () => {
      for (const observer of observers) observer.disconnect()
    }
  }, [count, prefersReducedMotion])
}

interface ExperienceCardProps {
  entry: (typeof experiences)[number]
  isEven: boolean
  reducedMotion: boolean
}

function ExperienceCard({ entry, isEven, reducedMotion }: ExperienceCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  // 进入视口时触发时期数字滚动动画（一次性）。
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  const { display: periodDisplay } = useCountUp({
    value: t(entry.periodKey),
    enabled: !reducedMotion,
    start: inView,
  })

  const iconConfig = ENTRY_ICONS[entry.id] ?? ENTRY_ICONS.xrm
  const Icon = iconConfig.icon

  return (
    <div
      ref={ref}
      data-experience-card={entry.id}
      tabIndex={0}
      className={`experience-card group relative rounded-2xl outline-none ${
        isEven ? 'md:col-start-1 md:col-end-2 md:row-start-1' : 'md:col-start-3 md:col-end-4 md:row-start-1'
      }`}
    >
      <Card tilt className="border-0 bg-transparent p-0">
        <div className="experience-gradient-border rounded-[20px] p-[1px] shadow-[0px_35px_120px_-15px_#211e35]">
          <div className="rounded-[19px] bg-[#151030] px-6 py-5">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3
                  id={`experience-title-${entry.id}`}
                  className="text-[20px] font-bold leading-snug text-white"
                >
                  {t(entry.titleKey)}
                </h3>
                {entry.organizationKey && (
                  <span className="mt-1.5 inline-block rounded-full border border-white/10 px-2.5 py-0.5 text-xs font-medium text-[#aaa6c3]">
                    {t(entry.organizationKey)}
                  </span>
                )}
              </div>
              <Icon
                size={40}
                style={{ color: iconConfig.color } as CSSProperties}
                className="h-10 w-10 shrink-0"
                aria-hidden="true"
              />
            </div>

            <p className="text-gradient-green mb-2 font-display text-sm font-bold tracking-wide">
              {periodDisplay}
            </p>

            <ul className="space-y-1">
              {entry.descriptionKeys.map((key) => (
                <li key={key} className="text-sm leading-relaxed text-[#aaa6c3]">
                  {t(key)}
                </li>
              ))}
            </ul>

            <div className={`experience-achievements mt-3 ${reducedMotion ? 'is-visible' : ''}`}>
              <p className="mb-2 text-xs font-semibold tracking-wide text-[#aaa6c3]">
                {t('experience.achievementsTitle')}
              </p>
              <ul className="space-y-1.5">
                {(entry.achievementKeys ?? []).map((key, index) => (
                  <li key={key} className={`text-[13px] leading-relaxed ${ACHIEVEMENT_GRADIENTS[index % 3]}`}>
                    <span className="mr-1" aria-hidden="true">
                      #
                    </span>
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-3 text-xs text-white/40">{t('experience.hoverHint')}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

export function ExperienceSection() {
  const timelineRef = useRef<HTMLOListElement>(null)
  const prefersReducedMotion = useReducedMotion()
  useTimelineProgress(timelineRef, experiences.length)
  useTimelineItems(experiences.length)

  // 键盘导航：←/→ 在卡片间循环切换焦点（焦点自动跟随）。
  const handleTimelineKeyDown = (event: React.KeyboardEvent<HTMLOListElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    const target = event.target as HTMLElement
    if (!target.classList.contains('experience-card')) return
    const cards = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('.experience-card')
    )
    const currentIndex = cards.indexOf(target)
    if (currentIndex === -1) return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = (currentIndex + direction + cards.length) % cards.length
    cards[nextIndex]?.focus()
  }

  return (
    <Section id="experience" title={t('experience.title')} subtitle={t('experience.subtitle')}>
      <ol
        ref={timelineRef}
        className="timeline relative mx-auto max-w-5xl list-none py-4 md:py-8"
        aria-label={t('experience.timelineLabel')}
        onKeyDown={handleTimelineKeyDown}
      >
        {experiences.map((entry, index) => {
          const isEven = index % 2 === 0

          return (
            <li
              key={entry.id}
              data-timeline-index={index}
              className={`timeline-item grid grid-cols-[auto_1fr] gap-4 md:grid-cols-[1fr_auto_1fr] md:gap-6 ${
                prefersReducedMotion ? 'is-visible' : ''
              }`}
              aria-labelledby={`experience-title-${entry.id}`}
            >
              <div
                className={`timeline-card-wrapper relative order-2 md:order-none ${
                  isEven ? 'md:col-start-1 md:col-end-2 md:row-start-1' : 'md:col-start-3 md:col-end-4 md:row-start-1'
                }`}
              >
                <ExperienceCard entry={entry} isEven={isEven} reducedMotion={prefersReducedMotion} />
              </div>

              <div className="order-1 flex w-10 flex-col items-center md:order-none md:col-start-2 md:col-end-3 md:w-20 md:justify-center">
                <div
                  className="timeline-node relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-bg bg-muted transition-transform duration-300"
                  aria-hidden="true"
                >
                  <span className="h-2 w-2 rounded-full bg-bg" />
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </Section>
  )
}

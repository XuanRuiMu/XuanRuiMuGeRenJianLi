import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Gamepad2, Heart, BookOpen, GraduationCap, Swords, Bot, ExternalLink, type LucideIcon } from 'lucide-react'
import { experiences } from '../../data/experience'
import { Section } from '../../components/ui/Section'
import { t } from '../../i18n/translations'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useCountUp } from '../../hooks/useCountUp'

const TIMELINE_PROGRESS_VAR = '--timeline-progress'

/** 各经历的图标与主题色（色值取自 02-react-three-fiber 卡片配色体系） */
const ENTRY_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  mcserver: { icon: Gamepad2, color: '#00cea8' },
  bachelor: { icon: BookOpen, color: '#56ccf2' },
  educator: { icon: GraduationCap, color: '#38ef7d' },
  wowguild: { icon: Swords, color: '#f472b6' },
  aiengineer: { icon: Bot, color: '#a78bfa' },
  indie: { icon: Heart, color: '#fb7185' },
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
  const 外层引用 = useRef<HTMLDivElement>(null)
  const 动画帧引用 = useRef(0)

  // 进入视口时触发时期数字滚动动画（一次性）。
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const element = 外层引用.current
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
  }, [外层引用])

  const 倾斜可用 = !reducedMotion

  useEffect(() => {
    if (!倾斜可用) return
    const 外层 = 外层引用.current
    if (!外层) return
    const 当前 = { x: 0.5, y: 0.5 }
    const 目标 = { x: 0.5, y: 0.5 }
    let 悬停中 = false
    let 按压中 = false
    let 上次指针: { x: number; y: number } | null = null
    const 系数 = 28
    const 插值 = 0.12
    const 应用 = () => {
      const 偏移X = 目标.x - 0.5
      const 偏移Y = 目标.y - 0.5
      const 旋转X = -偏移Y * 系数
      const 旋转Y = 偏移X * 系数
      const 放大 = 按压中 ? 0.985 : 悬停中 ? 1.06 : 1
      const 平移X = 偏移X * (按压中 ? 0 : 16)
      const 平移Y = 偏移Y * (按压中 ? 0 : 16)
      外层.style.transform =
        `translate3d(${平移X.toFixed(2)}px, ${平移Y.toFixed(2)}px, 0px) ` +
        `perspective(1000px) rotateX(${旋转X.toFixed(2)}deg) rotateY(${旋转Y.toFixed(2)}deg) scale(${放大})`
    }
    const 推进 = () => {
      当前.x += (目标.x - 当前.x) * 插值
      当前.y += (目标.y - 当前.y) * 插值
      目标.x = 当前.x
      目标.y = 当前.y
      应用()
      const 静止 = Math.abs(目标.x - 0.5) < 0.001 && Math.abs(目标.y - 0.5) < 0.001
      if (悬停中 || !静止) {
        动画帧引用.current = requestAnimationFrame(推进)
      } else {
        外层.style.transform = ''
        动画帧引用.current = 0
      }
    }
    const 启动 = () => {
      if (动画帧引用.current) return
      动画帧引用.current = requestAnimationFrame(推进)
    }
    const 由指针同步 = (水平: number, 垂直: number, 是否按压 = 按压中) => {
      const 矩形 = 外层.getBoundingClientRect()
      if (!(矩形.width > 0 && 矩形.height > 0)) return
      const 有限水平 = Number.isFinite(水平) ? 水平 : 矩形.left + 目标.x * 矩形.width
      const 有限垂直 = Number.isFinite(垂直) ? 垂直 : 矩形.top + 目标.y * 矩形.height
      const 归一X = Math.min(1, Math.max(0, (有限水平 - 矩形.left) / 矩形.width))
      const 归一Y = Math.min(1, Math.max(0, (有限垂直 - 矩形.top) / 矩形.height))
      上次指针 = { x: 有限水平, y: 有限垂直 }
      悬停中 = true
      按压中 = 是否按压
      外层.classList.toggle('is-pressed', 是否按压)
      if (是否按压) {
        // 按压态回正下沉：不再跟随指针倾斜，避免透视下描边层与悬停高光层错位重影
        目标.x = 0.5
        目标.y = 0.5
        当前.x = 0.5
        当前.y = 0.5
      } else {
        目标.x = 归一X
        目标.y = 归一Y
        当前.x = 归一X
        当前.y = 归一Y
      }
      应用()
      启动()
    }
    const 移入 = (事件: PointerEvent) => 由指针同步(事件.clientX, 事件.clientY, false)
    const 移动 = (事件: PointerEvent) => 由指针同步(事件.clientX, 事件.clientY, 按压中)
    const 按下 = (事件: PointerEvent | MouseEvent) => {
      由指针同步(事件.clientX, 事件.clientY, true)
    }
    const 抬起 = () => {
      按压中 = false
      外层.classList.remove('is-pressed')
      if (悬停中) 应用()
    }
    const 离开 = () => {
      悬停中 = false
      按压中 = false
      外层.classList.remove('is-pressed')
      上次指针 = null
      目标.x = 0.5
      目标.y = 0.5
      当前.x = 0.5
      当前.y = 0.5
      启动()
    }
    const 视口变化 = () => {
      if (!上次指针 || !悬停中) return
      由指针同步(上次指针.x, 上次指针.y)
    }
    外层.classList.add('tilt-card', 'will-change-transform')
    外层.addEventListener('pointerenter', 移入)
    外层.addEventListener('pointermove', 移动)
    外层.addEventListener('pointerdown', 按下)
    外层.addEventListener('mousedown', 按下)
    外层.addEventListener('pointerup', 抬起)
    外层.addEventListener('pointercancel', 抬起)
    外层.addEventListener('mouseup', 抬起)
    外层.addEventListener('pointerleave', 离开)
    window.addEventListener('scroll', 视口变化, { capture: true, passive: true })
    window.addEventListener('resize', 视口变化, { passive: true })
    window.addEventListener('wheel', 视口变化, { passive: true })
    return () => {
      外层.classList.remove('tilt-card', 'will-change-transform', 'is-pressed')
      外层.removeEventListener('pointerenter', 移入)
      外层.removeEventListener('pointermove', 移动)
      外层.removeEventListener('pointerdown', 按下)
      外层.removeEventListener('mousedown', 按下)
      外层.removeEventListener('pointerup', 抬起)
      外层.removeEventListener('pointercancel', 抬起)
      外层.removeEventListener('mouseup', 抬起)
      外层.removeEventListener('pointerleave', 离开)
      window.removeEventListener('scroll', 视口变化, { capture: true })
      window.removeEventListener('resize', 视口变化)
      window.removeEventListener('wheel', 视口变化)
      if (动画帧引用.current) cancelAnimationFrame(动画帧引用.current)
      动画帧引用.current = 0
      外层.style.transform = ''
    }
  }, [倾斜可用])

  const { display: periodDisplay } = useCountUp({
    value: t(entry.periodKey),
    enabled: !reducedMotion,
    start: inView,
  })

  const iconConfig = ENTRY_ICONS[entry.id] ?? ENTRY_ICONS.mcserver
  const Icon = iconConfig.icon

  return (
    <div
      ref={外层引用}
      data-experience-card={entry.id}
      data-tilt-outer="true"
      tabIndex={0}
      className={`experience-card group relative rounded-2xl outline-none ${
        isEven ? 'md:col-start-1 md:col-end-2 md:row-start-1' : 'md:col-start-3 md:col-end-4 md:row-start-1'
      }`}
    >
      <div className="experience-gradient-border rounded-2xl p-px shadow-[0px_35px_120px_-15px_var(--color-panel-shadow)]">
        <div className="rounded-2xl bg-panel px-6 py-5">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 id={`experience-title-${entry.id}`} className="text-[20px] font-bold leading-snug text-text-primary">
                {t(entry.titleKey)}
              </h3>
              {entry.organizationKey && (
                <span className="mt-1.5 inline-block rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-text-secondary">
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

          <p className="text-gradient-green mb-2 font-display text-sm font-bold tracking-wide">{periodDisplay}</p>

          <ul className="space-y-1">
            {entry.descriptionKeys.map((key) => (
              <li key={key} className="text-sm leading-relaxed text-text-secondary">
                {t(key)}
              </li>
            ))}
          </ul>

          <div className={`experience-achievements mt-3 ${reducedMotion ? 'is-visible' : ''}`}>
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

          {entry.links && entry.links.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {entry.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-text-primary/70 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label={`${t(entry.titleKey)}：${t(link.labelKey)}`}
                >
                  <span>{t(link.labelKey)}</span>
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
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
    const cards = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('.experience-card'))
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

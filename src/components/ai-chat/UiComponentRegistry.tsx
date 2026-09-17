import { useRef, useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { t, type TranslationKey } from '../../i18n/translations'
import { cn } from '../../lib/utils'
import { projects } from '../../data/projects'
import { experiences } from '../../data/experience'
import { education } from '../../data/education'
import { personalInfo } from '../../data/personalInfo'
import type { ProjectCardComponent, TimelineComponent, UiComponent } from '../../ai/structuredOutput'

interface ComponentRendererProps<T extends UiComponent> {
  component: T
}

function ProjectCardRenderer({ component }: ComponentRendererProps<ProjectCardComponent>) {
  const project = projects.find((item) => item.id === component.projectId)

  if (!project) {
    return (
      <div className="rounded-xl border border-border bg-surface-elevated p-4 text-sm text-muted">
        {t('ai.component.projectNotFound')}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
      <div className="border-b border-border bg-surface px-4 py-3">
        <h3 className="text-sm font-medium text-text-primary">{t(project.nameKey)}</h3>
      </div>
      <div className="px-4 py-3">
        <p className="mb-3 text-xs leading-relaxed text-text-secondary">{t(project.descKey)}</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] text-secondary">
              {tag}
            </span>
          ))}
        </div>
        {project.links && project.links.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {project.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {t(link.labelKey)}
                <ExternalLink size={10} />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface TimelineEntry {
  year: string
  label: string
}

const TIMELINE_TITLE_KEYS: Record<NonNullable<TimelineComponent['scope']>, TranslationKey> = {
  experience: 'experience.title',
  media: 'media.title',
  education: 'education.title',
}

function getMediaTimelineEntries(): TimelineEntry[] {
  return [
    { year: '2022', label: t('data.media.timeline.2022') },
    { year: '2023', label: t('data.media.timeline.2023') },
    { year: '2024', label: t('data.media.timeline.2024') },
    { year: '2025', label: t('data.media.timeline.2025') },
  ]
}

function getExperienceTimelineEntries(): TimelineEntry[] {
  return experiences.map((entry) => ({
    year: t(entry.periodKey).split(' ')[0] ?? t(entry.periodKey),
    label: `${t(entry.titleKey)}${entry.organizationKey ? ` · ${t(entry.organizationKey)}` : ''}`,
  }))
}

function getEducationTimelineEntries(): TimelineEntry[] {
  const summary = education.summary
  return [
    { year: summary.period.split(' - ')[0] ?? summary.period, label: `${summary.school} · ${summary.major}` },
    ...education.achievementKeys.map((key) => ({ year: '', label: t(key) })),
  ]
}

function getTimelineEntries(scope: TimelineComponent['scope']): TimelineEntry[] {
  switch (scope) {
    case 'experience':
      return getExperienceTimelineEntries()
    case 'education':
      return getEducationTimelineEntries()
    case 'media':
      return getMediaTimelineEntries()
    default:
      return getExperienceTimelineEntries()
  }
}

function TimelineRenderer({ component }: ComponentRendererProps<TimelineComponent>) {
  const title = component.scope ? t(TIMELINE_TITLE_KEYS[component.scope]) : t('experience.title')
  const entries = getTimelineEntries(component.scope)

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4">
      <h3 className="mb-3 text-xs font-medium text-text-primary">{title}</h3>
      <div className="relative space-y-4 pl-4 before:absolute before:left-1.5 before:top-1 before:h-[calc(100%-8px)] before:w-px before:bg-border">
        {entries.map((entry, index) => (
          <div key={`${entry.year}-${index}`} className="relative">
            <span className="absolute -left-4 top-1 h-3 w-3 rounded-full border-2 border-border bg-surface" />
            {entry.year && <p className="text-[10px] font-medium text-primary">{entry.year}</p>}
            <p className="text-xs text-text-secondary">{entry.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ContactLinksRenderer() {
  const [已复制, set已复制] = useState<string | null>(null)
  const 计时器 = useRef<number | undefined>(undefined)
  const 标记复制成功 = (id: string) => {
    set已复制(id)
    window.clearTimeout(计时器.current)
    计时器.current = window.setTimeout(() => set已复制(null), 2000)
  }
  const 复制文本 = async (id: string, 文本: string) => {
    try {
      await navigator.clipboard.writeText(文本)
      标记复制成功(id)
    } catch {
      return
    }
  }
  const 尝试唤起 = (地址: string) => {
    try {
      window.open(地址, '_blank', 'noopener')
    } catch {
      return
    }
  }
  const 复制并唤起 = (id: string, 文本: string, 地址: string) => {
    void 复制文本(id, 文本)
    尝试唤起(地址)
  }
  const 按钮样式 =
    'inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text-primary transition-colors hover:border-primary'
  const 直开项 = [
    { id: 'github', 地址: personalInfo.github, 标签: t('ai.contactLinks.github') },
    { id: 'bilibili', 地址: personalInfo.bilibili, 标签: t('ai.contactLinks.bilibili') },
  ]
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-3">
      <div className="grid grid-cols-2 gap-2">
        {直开项.map((项) => (
          <a
            key={项.id}
            href={项.地址}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${项.标签}${t('ai.contactLinks.open')}`}
            className={按钮样式}
          >
            <span className="truncate">{项.标签}</span>
            <ExternalLink size={12} />
          </a>
        ))}
        <button
          type="button"
          aria-label={`${t('ai.contactLinks.qq')}${t('ai.contactLinks.copy')}`}
          onClick={() => 复制并唤起('qq', personalInfo.qq, `tencent://message/?uin=${personalInfo.qq}`)}
          className={按钮样式}
        >
          {已复制 === 'qq' ? <Check size={12} /> : <Copy size={12} />}
          <span className="truncate">
            {t('ai.contactLinks.qq')} · {已复制 === 'qq' ? t('ai.contactLinks.copied') : t('ai.contactLinks.copy')}
          </span>
        </button>
        <button
          type="button"
          aria-label={`${t('ai.contactLinks.wechat')}${t('ai.contactLinks.copy')}`}
          onClick={() => 复制并唤起('wechat', personalInfo.wechat, 'weixin://')}
          className={按钮样式}
        >
          {已复制 === 'wechat' ? <Check size={12} /> : <Copy size={12} />}
          <span className="truncate">
            {t('ai.contactLinks.wechat')} ·{' '}
            {已复制 === 'wechat' ? t('ai.contactLinks.copied') : t('ai.contactLinks.copy')}
          </span>
        </button>
        <button
          type="button"
          aria-label={`${t('ai.contactLinks.phone')}${t('ai.contactLinks.copy')}`}
          onClick={() => void 复制文本('phone', personalInfo.phone)}
          className={cn(按钮样式, 'col-span-2')}
        >
          {已复制 === 'phone' ? <Check size={12} /> : <Copy size={12} />}
          <span className="truncate">
            {t('ai.contactLinks.phone')} ·{' '}
            {已复制 === 'phone' ? t('ai.contactLinks.copied') : t('ai.contactLinks.copy')}
          </span>
        </button>
      </div>
    </div>
  )
}

interface UiComponentRendererProps {
  component: UiComponent
  className?: string
}

export function UiComponentRenderer({ component, className }: UiComponentRendererProps) {
  return (
    <div className={cn('mt-2', className)} data-testid={`ui-component-${component.type}`}>
      {component.type === 'ProjectCard' && <ProjectCardRenderer component={component} />}
      {component.type === 'Timeline' && <TimelineRenderer component={component} />}
      {component.type === 'ContactLinks' && <ContactLinksRenderer />}
    </div>
  )
}

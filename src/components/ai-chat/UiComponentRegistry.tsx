import { useState, type FormEvent } from 'react'
import { ExternalLink, Send, CheckCircle } from 'lucide-react'
import { t, type TranslationKey } from '../../i18n/translations'
import { cn } from '../../lib/utils'
import { projects } from '../../data/projects'
import { experiences } from '../../data/experience'
import { education } from '../../data/education'
import { personalInfo } from '../../data/personalInfo'
import { Button } from '../ui/Button'
import type {
  ProjectCardComponent,
  TimelineComponent,
  ContactFormComponent,
  UiComponent,
} from '../../ai/structuredOutput'

interface ComponentRendererProps<T extends UiComponent> {
  component: T
}

const CONTACT_VALIDATION = {
  nameMin: 1,
  emailPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  messageMin: 10,
  messageMax: 500,
} as const

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

function ContactFormRenderer(_props: ComponentRendererProps<ContactFormComponent>) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = (): boolean => {
    if (name.trim().length < CONTACT_VALIDATION.nameMin) {
      setError(t('contact.validation.nameRequired'))
      return false
    }
    if (!CONTACT_VALIDATION.emailPattern.test(email)) {
      setError(t('contact.validation.emailInvalid'))
      return false
    }
    if (message.trim().length < CONTACT_VALIDATION.messageMin) {
      setError(t('contact.validation.messageMin'))
      return false
    }
    if (message.trim().length > CONTACT_VALIDATION.messageMax) {
      setError(t('contact.validation.messageMax'))
      return false
    }
    return true
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!validate()) return

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-elevated p-6 text-center">
        <CheckCircle size={24} className="text-primary" />
        <p className="text-sm font-medium text-text-primary">{t('contact.form.success')}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-surface-elevated p-4">
      <h3 className="text-xs font-medium text-text-primary">{t('contact.form.submit')}</h3>
      <input
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={t('contact.form.name')}
        className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text-primary outline-none placeholder:text-muted focus-visible:border-primary"
        maxLength={50}
      />
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={t('contact.form.email')}
        className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text-primary outline-none placeholder:text-muted focus-visible:border-primary"
        maxLength={100}
      />
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={t('contact.form.message')}
        rows={3}
        className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text-primary outline-none placeholder:text-muted focus-visible:border-primary"
        maxLength={CONTACT_VALIDATION.messageMax}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <Button type="submit" size="sm" icon={<Send size={12} />} className="w-full">
        {t('contact.form.submit')}
      </Button>
      <p className="text-center text-[10px] text-muted">
        {t('contact.info.email')}: {personalInfo.email}
      </p>
    </form>
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
      {component.type === 'ContactForm' && <ContactFormRenderer component={component} />}
    </div>
  )
}

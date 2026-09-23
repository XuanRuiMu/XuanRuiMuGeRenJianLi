import { Section } from '../../components/ui/Section'
import { Reveal } from '../../components/Reveal'
import { t } from '../../i18n/translations'
import { 推荐语列表 } from '../../data/testimonials'

export function TestimonialsSection() {
  const 卡片表 = 推荐语列表()
  return (
    <Section id="testimonials" title={t('testimonials.title')}>
      <div className="grid gap-5 md:grid-cols-2">
        {卡片表.map((卡片) => (
          <Reveal key={卡片.id}>
            <figure className="flex h-full flex-col rounded-2xl border border-border bg-panel p-5">
              <blockquote className="flex-1 text-sm leading-relaxed text-text-secondary">
                <span className="mr-1 font-display text-2xl leading-none text-primary" aria-hidden="true">
                  “
                </span>
                {卡片.quote}
              </blockquote>
              <figcaption className="mt-4 border-t border-border pt-3">
                <p className="text-sm font-medium text-text-primary">{卡片.role}</p>
                <p className="mt-0.5 text-xs text-text-secondary">{卡片.context}</p>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

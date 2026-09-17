import { Section } from '../../components/ui/Section'
import { Reveal } from '../../components/Reveal'
import { t, type TranslationKey } from '../../i18n/translations'

const ITEMS = ['graduate', 'player', 'collaborator'] as const

export function TestimonialsSection() {
  return (
    <Section id="testimonials" title={t('testimonials.title')} subtitle={t('testimonials.subtitle')}>
      <div className="grid gap-5 md:grid-cols-3">
        {ITEMS.map((item) => (
          <Reveal key={item}>
            <figure className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#151030] p-5">
              <blockquote className="flex-1 text-sm leading-relaxed text-[#cfc9e6]">
                <span className="mr-1 font-display text-2xl leading-none text-primary" aria-hidden="true">
                  “
                </span>
                {t(`testimonials.items.${item}.quote` as unknown as TranslationKey)}
              </blockquote>
              <figcaption className="mt-4 border-t border-white/10 pt-3">
                <p className="text-sm font-medium text-white">
                  {t(`testimonials.items.${item}.role` as unknown as TranslationKey)}
                </p>
                <p className="mt-0.5 text-xs text-[#aaa6c3]">
                  {t(`testimonials.items.${item}.context` as unknown as TranslationKey)}
                </p>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted">{t('testimonials.note')}</p>
    </Section>
  )
}

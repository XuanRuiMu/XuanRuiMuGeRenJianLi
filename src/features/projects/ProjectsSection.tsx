import { Section } from '../../components/ui/Section'
import { t } from '../../i18n/translations'
import { ClotheslineNotes } from './ClotheslineNotes'

export function ProjectsSection() {
  return (
    <Section id="projects" title={t('projects.title')} subtitle={t('projects.subtitle')}>
      <ClotheslineNotes />
    </Section>
  )
}

import { BanKuai } from '../../components/ui/BanKuai'
import { t } from '../../i18n/翻译'
import { ClotheslineNotes } from './ClotheslineNotes'

export function ProjectsSection() {
  return (
    <BanKuai id="projects" title={t('projects.title')} subtitle={t('projects.subtitle')}>
      <ClotheslineNotes />
    </BanKuai>
  )
}

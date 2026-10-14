import { BanKuai } from '../../components/ui/BanKuai'
import { t } from '../../i18n/翻译'
import { LiangYiShuangBiJi } from './LiangYiShuangBiJi'

export function XiangMuBanKuai() {
  return (
    <BanKuai id="projects" title={t('projects.title')} subtitle={t('projects.subtitle')}>
      <LiangYiShuangBiJi />
    </BanKuai>
  )
}

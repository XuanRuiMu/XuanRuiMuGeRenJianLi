import { BanKuai } from '../../组件/基础组件/BanKuai'
import { t } from '../../国际化/翻译'
import { LiangYiShuangBiJi } from './LiangYiShuangBiJi'

export function XiangMuBanKuai() {
  return (
    <BanKuai id="projects" title={t('projects.title')} 副标题={t('projects.subtitle')}>
      <LiangYiShuangBiJi />
    </BanKuai>
  )
}

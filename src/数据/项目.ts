import type { 项目 } from './类型'
import { ta } from '../国际化/翻译'

export const 恋爱吧GitHub地址 = 'https://github.com/XuanRuiMu/HeWoLianAiBa'
export const 羊来官网地址 = 'https://xuanruimu.github.io/YangLai/'

export const 暮澜链接 = 'https://github.com/XuanRuiMu/XRMChaJian'

export const 项目表: 项目[] = [
  {
    id: 'xrm',
    nameKey: 'data.projects.xrm.name',
    descKey: 'data.projects.xrm.desc',
    tags: ta('data.projects.xrm.tags'),
    metricKeys: ['data.projects.xrm.metrics.classes', 'data.projects.xrm.metrics.systems'],
    links: [{ labelKey: 'projects.link.github', url: 暮澜链接 }],
  },
  {
    id: 'lovewithme',
    nameKey: 'data.projects.lovewithme.name',
    descKey: 'data.projects.lovewithme.desc',
    tags: ta('data.projects.lovewithme.tags'),
    metricKeys: ['data.projects.lovewithme.metrics.services', 'data.projects.lovewithme.metrics.security'],
    links: [{ labelKey: 'projects.link.github', url: 恋爱吧GitHub地址 }],
  },
  {
    id: 'aiConsole',
    nameKey: 'data.projects.aiConsole.name',
    descKey: 'data.projects.aiConsole.desc',
    tags: ta('data.projects.aiConsole.tags'),
    metricKeys: ['data.projects.aiConsole.metrics.lines', 'data.projects.aiConsole.metrics.sources'],
    links: [{ labelKey: 'projects.link.github', url: 'https://github.com/XuanRuiMu/loop-engineering' }],
  },
  {
    id: 'yangLai',
    nameKey: 'data.projects.yangLai.name',
    descKey: 'data.projects.yangLai.desc',
    tags: ta('data.projects.yangLai.tags'),
    metricKeys: ['data.projects.yangLai.metrics.stack', 'data.projects.yangLai.metrics.tests'],
    links: [{ labelKey: 'projects.link.web', url: 羊来官网地址 }],
  },
]

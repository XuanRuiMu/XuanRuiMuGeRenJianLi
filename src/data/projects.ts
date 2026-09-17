import type { Project } from './types'
import { ta } from '../i18n/translations'

export const lovewithmeGithubUrl = 'https://github.com/XuanRuiMu/HeWoLianAiBa'
export const fengLaiWebUrl = 'https://xuanruimu.github.io/FengLai/index.html'

export const 暮澜链接 = 'https://github.com/XuanRuiMu/XRMChaJian'

export const projects: Project[] = [
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
    links: [{ labelKey: 'projects.link.github', url: lovewithmeGithubUrl }],
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
    id: 'fengLai',
    nameKey: 'data.projects.fengLai.name',
    descKey: 'data.projects.fengLai.desc',
    tags: ta('data.projects.fengLai.tags'),
    metricKeys: ['data.projects.fengLai.metrics.stack', 'data.projects.fengLai.metrics.tests'],
    links: [{ labelKey: 'projects.link.web', url: fengLaiWebUrl }],
  },
]

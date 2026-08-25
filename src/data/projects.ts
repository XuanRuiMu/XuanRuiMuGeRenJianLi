import type { Project } from './types'
import { personalInfo } from './personalInfo'
import { ta } from '../i18n/translations'

export const projects: Project[] = [
  {
    id: 'xrm',
    nameKey: 'data.projects.xrm.name',
    descKey: 'data.projects.xrm.desc',
    tags: ta('data.projects.xrm.tags'),
    metricKeys: ['data.projects.xrm.metrics.classes', 'data.projects.xrm.metrics.systems'],
    links: [{ labelKey: 'projects.link.github', url: personalInfo.github }],
  },
  {
    id: 'lovewithme',
    nameKey: 'data.projects.lovewithme.name',
    descKey: 'data.projects.lovewithme.desc',
    tags: ta('data.projects.lovewithme.tags'),
    metricKeys: ['data.projects.lovewithme.metrics.services', 'data.projects.lovewithme.metrics.security'],
  },
  {
    id: 'aiConsole',
    nameKey: 'data.projects.aiConsole.name',
    descKey: 'data.projects.aiConsole.desc',
    tags: ta('data.projects.aiConsole.tags'),
    metricKeys: ['data.projects.aiConsole.metrics.lines', 'data.projects.aiConsole.metrics.sources'],
    links: [{ labelKey: 'projects.link.github', url: 'https://github.com/XuanRuiMu/loop-engineering' }],
  },
]

import type { 项目 } from './类型'
import { 翻译数组 } from '../国际化/翻译'

export const 恋爱吧GitHub地址 = 'https://github.com/XuanRuiMu/HeWoLianAiBa'
export const 羊来官网地址 = 'https://xuanruimu.github.io/YangLai/'

export const 暮澜链接 = 'https://github.com/XuanRuiMu/XRMChaJian'

export const 项目表: 项目[] = [
  {
    id: 'xrm',
    名称键: 'data.projects.xrm.name',
    描述键: 'data.projects.xrm.desc',
    标签表: 翻译数组('data.projects.xrm.tags'),
    指标键表: ['data.projects.xrm.metrics.classes', 'data.projects.xrm.metrics.systems'],
    链接表: [{ 标签键: 'projects.link.github', url: 暮澜链接 }],
  },
  {
    id: 'lovewithme',
    名称键: 'data.projects.lovewithme.name',
    描述键: 'data.projects.lovewithme.desc',
    标签表: 翻译数组('data.projects.lovewithme.tags'),
    指标键表: ['data.projects.lovewithme.metrics.services', 'data.projects.lovewithme.metrics.security'],
    链接表: [{ 标签键: 'projects.link.github', url: 恋爱吧GitHub地址 }],
  },
  {
    id: 'aiConsole',
    名称键: 'data.projects.aiConsole.name',
    描述键: 'data.projects.aiConsole.desc',
    标签表: 翻译数组('data.projects.aiConsole.tags'),
    指标键表: ['data.projects.aiConsole.metrics.lines', 'data.projects.aiConsole.metrics.sources'],
    链接表: [{ 标签键: 'projects.link.github', url: 'https://github.com/XuanRuiMu/loop-engineering' }],
  },
  {
    id: 'yangLai',
    名称键: 'data.projects.yangLai.name',
    描述键: 'data.projects.yangLai.desc',
    标签表: 翻译数组('data.projects.yangLai.tags'),
    指标键表: ['data.projects.yangLai.metrics.stack', 'data.projects.yangLai.metrics.tests'],
    链接表: [{ 标签键: 'projects.link.web', url: 羊来官网地址 }],
  },
]

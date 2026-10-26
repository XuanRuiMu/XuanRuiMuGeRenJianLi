import type { 经历条目 } from './类型'
import { 个人信息 } from './个人信息'

export const 教育者B站地址 = 'https://space.bilibili.com/383504924/upload/video'
export const 公会视频地址 =
  'https://www.bilibili.com/video/BV18jS9YvEyC/?spm_id_from=333.1387.upload.video_card.click&vd_source=7d17ffe17327fa579fc4419f1789bd27'

export const 暮澜链接 = 'https://github.com/XuanRuiMu/XRMChaJian'

export const 经历表: 经历条目[] = [
  {
    id: 'mcserver',
    标题键: 'data.experience.entries.mcserver.title',
    机构键: 'data.experience.entries.mcserver.organization',
    周期键: 'data.experience.entries.mcserver.period',
    描述键表: ['data.experience.entries.mcserver.description'],
    成就键表: [
      'data.experience.entries.mcserver.achievement1',
      'data.experience.entries.mcserver.achievement2',
      'data.experience.entries.mcserver.achievement3',
    ],
    链接表: [{ 标签键: 'projects.link.github', url: 暮澜链接 }],
  },
  {
    id: 'bachelor',
    标题键: 'data.experience.entries.bachelor.title',
    机构键: 'data.experience.entries.bachelor.organization',
    周期键: 'data.experience.entries.bachelor.period',
    描述键表: ['data.experience.entries.bachelor.description'],
    成就键表: ['data.experience.entries.bachelor.achievement1', 'data.experience.entries.bachelor.achievement2'],
  },
  {
    id: 'educator',
    标题键: 'data.experience.entries.educator.title',
    机构键: 'data.experience.entries.educator.organization',
    周期键: 'data.experience.entries.educator.period',
    描述键表: ['data.experience.entries.educator.description'],
    成就键表: [
      'data.experience.entries.educator.achievement1',
      'data.experience.entries.educator.achievement2',
      'data.experience.entries.educator.achievement3',
    ],
    链接表: [{ 标签键: 'projects.link.bilibili', url: 教育者B站地址 }],
  },
  {
    id: 'wowguild',
    标题键: 'data.experience.entries.wowguild.title',
    机构键: 'data.experience.entries.wowguild.organization',
    周期键: 'data.experience.entries.wowguild.period',
    描述键表: ['data.experience.entries.wowguild.description'],
    成就键表: ['data.experience.entries.wowguild.achievement1', 'data.experience.entries.wowguild.achievement2'],
    链接表: [{ 标签键: 'projects.link.bilibili', url: 公会视频地址 }],
  },
  {
    id: 'aiengineer',
    标题键: 'data.experience.entries.aiengineer.title',
    机构键: 'data.experience.entries.aiengineer.organization',
    周期键: 'data.experience.entries.aiengineer.period',
    描述键表: ['data.experience.entries.aiengineer.description'],
    成就键表: [
      'data.experience.entries.aiengineer.achievement1',
      'data.experience.entries.aiengineer.achievement2',
      'data.experience.entries.aiengineer.achievement3',
    ],
  },
  {
    id: 'indie',
    标题键: 'data.experience.entries.indie.title',
    机构键: 'data.experience.entries.indie.organization',
    周期键: 'data.experience.entries.indie.period',
    描述键表: ['data.experience.entries.indie.description'],
    成就键表: [
      'data.experience.entries.indie.achievement1',
      'data.experience.entries.indie.achievement2',
      'data.experience.entries.indie.achievement3',
    ],
    链接表: [{ 标签键: 'projects.link.github', url: 个人信息.GitHub }],
  },
]

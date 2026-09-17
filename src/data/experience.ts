import type { ExperienceEntry } from './types'
import { personalInfo } from './personalInfo'

export const educatorBilibiliUrl = 'https://space.bilibili.com/383504924/upload/video'
export const wowguildVideoUrl =
  'https://www.bilibili.com/video/BV18jS9YvEyC/?spm_id_from=333.1387.upload.video_card.click&vd_source=7d17ffe17327fa579fc4419f1789bd27'

export const 暮澜链接 = 'https://github.com/XuanRuiMu/XRMChaJian'

export const experiences: ExperienceEntry[] = [
  {
    id: 'mcserver',
    titleKey: 'data.experience.entries.mcserver.title',
    organizationKey: 'data.experience.entries.mcserver.organization',
    periodKey: 'data.experience.entries.mcserver.period',
    descriptionKeys: ['data.experience.entries.mcserver.description'],
    achievementKeys: [
      'data.experience.entries.mcserver.achievement1',
      'data.experience.entries.mcserver.achievement2',
      'data.experience.entries.mcserver.achievement3',
    ],
    links: [{ labelKey: 'projects.link.github', url: 暮澜链接 }],
  },
  {
    id: 'bachelor',
    titleKey: 'data.experience.entries.bachelor.title',
    organizationKey: 'data.experience.entries.bachelor.organization',
    periodKey: 'data.experience.entries.bachelor.period',
    descriptionKeys: ['data.experience.entries.bachelor.description'],
    achievementKeys: ['data.experience.entries.bachelor.achievement1', 'data.experience.entries.bachelor.achievement2'],
  },
  {
    id: 'educator',
    titleKey: 'data.experience.entries.educator.title',
    organizationKey: 'data.experience.entries.educator.organization',
    periodKey: 'data.experience.entries.educator.period',
    descriptionKeys: ['data.experience.entries.educator.description'],
    achievementKeys: [
      'data.experience.entries.educator.achievement1',
      'data.experience.entries.educator.achievement2',
      'data.experience.entries.educator.achievement3',
    ],
    links: [{ labelKey: 'projects.link.bilibili', url: educatorBilibiliUrl }],
  },
  {
    id: 'wowguild',
    titleKey: 'data.experience.entries.wowguild.title',
    organizationKey: 'data.experience.entries.wowguild.organization',
    periodKey: 'data.experience.entries.wowguild.period',
    descriptionKeys: ['data.experience.entries.wowguild.description'],
    achievementKeys: ['data.experience.entries.wowguild.achievement1', 'data.experience.entries.wowguild.achievement2'],
    links: [{ labelKey: 'projects.link.bilibili', url: wowguildVideoUrl }],
  },
  {
    id: 'aiengineer',
    titleKey: 'data.experience.entries.aiengineer.title',
    organizationKey: 'data.experience.entries.aiengineer.organization',
    periodKey: 'data.experience.entries.aiengineer.period',
    descriptionKeys: ['data.experience.entries.aiengineer.description'],
    achievementKeys: [
      'data.experience.entries.aiengineer.achievement1',
      'data.experience.entries.aiengineer.achievement2',
      'data.experience.entries.aiengineer.achievement3',
    ],
  },
  {
    id: 'indie',
    titleKey: 'data.experience.entries.indie.title',
    organizationKey: 'data.experience.entries.indie.organization',
    periodKey: 'data.experience.entries.indie.period',
    descriptionKeys: ['data.experience.entries.indie.description'],
    achievementKeys: [
      'data.experience.entries.indie.achievement1',
      'data.experience.entries.indie.achievement2',
      'data.experience.entries.indie.achievement3',
    ],
    links: [{ labelKey: 'projects.link.github', url: personalInfo.github }],
  },
]

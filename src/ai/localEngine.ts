import type { AiMessage } from '../store/useAppStore'
import { t, type TranslationKey } from '../i18n/translations'
import { personalInfo } from '../data/personalInfo'
import { 求职方向 } from '../data/careerFocus'
import type { UiComponent } from './structuredOutput'
import { 是否纯问候, 是否感谢, 是否告别, 检测项目卡片, 命中兜底意图 } from './intentTable'

interface LocalRule {
  意图ID: string
  /** 与主意图共用同一段预制答案的意图（项目类意图统一答"做过哪些项目"） */
  聚合意图ID?: string[]
  key: 'name' | 'target' | 'contact' | 'projects' | 'skills' | 'education' | 'experience'
  component?: UiComponent
}

function formatAnswer(key: LocalRule['key']): string {
  const base = t(`chat.answers.${key}` as unknown as TranslationKey)
  return base
    .replace('{name}', personalInfo.name)
    .replace('{direction}', 求职方向())
    .replace('{school}', personalInfo.education.school)
    .replace('{major}', personalInfo.education.major)
    .replace('{degree}', personalInfo.education.degree)
    .replace('{period}', personalInfo.education.period)
}

/** 兜底作答规则表：与 共享意图表 中兜底触发词非空的意图一一对应（一致性由 localEngine.test.ts 锁死） */
export const RULES: LocalRule[] = [
  { 意图ID: 'name', key: 'name' },
  { 意图ID: 'target', key: 'target' },
  { 意图ID: 'contact', key: 'contact', component: { type: 'ContactLinks' } },
  {
    意图ID: 'projects-通用',
    聚合意图ID: ['projects-xrm', 'projects-爱与循环', 'projects-蜂来'],
    key: 'projects',
    component: { type: 'ProjectCard', projectId: 'xrm' },
  },
  { 意图ID: 'tech', key: 'skills' },
  { 意图ID: 'education', key: 'education', component: { type: 'Timeline', scope: 'education' } },
  {
    意图ID: 'experience',
    key: 'experience',
    component: { type: 'Timeline', scope: 'experience' },
  },
]

function 命中意图(规则: LocalRule, 文本: string): boolean {
  if (命中兜底意图(规则.意图ID, 文本)) return true
  return (规则.聚合意图ID ?? []).some((意图ID) => 命中兜底意图(意图ID, 文本))
}

export function getLocalAnswer(input: string): AiMessage {
  const text = input.toLowerCase()

  if (是否纯问候(input) || 是否感谢(input) || 是否告别(input)) {
    if (是否感谢(input)) return { role: 'assistant', content: t('chat.answers.thanks') }
    if (是否告别(input)) return { role: 'assistant', content: t('chat.answers.farewell') }
    return { role: 'assistant', content: t('chat.answers.greeting') }
  }

  const projectId = 检测项目卡片(input)
  if (projectId) {
    return {
      role: 'assistant',
      content: formatAnswer('projects'),
      component: { type: 'ProjectCard', projectId },
    }
  }

  const rule = RULES.find((item) => 命中意图(item, text))

  if (!rule) {
    return {
      role: 'assistant',
      content: t('chat.answers.fallback' as unknown as TranslationKey),
    }
  }

  return { role: 'assistant', content: formatAnswer(rule.key), component: rule.component }
}

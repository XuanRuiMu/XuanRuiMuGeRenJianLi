import type { AiMessage } from '../store/useAppStore'
import { t, type TranslationKey } from '../i18n/translations'
import { personalInfo } from '../data/personalInfo'
import type { ProjectCardComponent, UiComponent } from './structuredOutput'

interface LocalRule {
  keywords: string[]
  key: 'name' | 'target' | 'contact' | 'projects' | 'skills' | 'education' | 'experience'
  component?: UiComponent
}

function formatAnswer(key: LocalRule['key']): string {
  const base = t(`chat.answers.${key}` as unknown as TranslationKey)
  return base
    .replace('{name}', personalInfo.name)
    .replace('{email}', personalInfo.email)
    .replace('{phone}', personalInfo.phone)
    .replace('{school}', personalInfo.education.school)
    .replace('{major}', personalInfo.education.major)
    .replace('{degree}', personalInfo.education.degree)
    .replace('{period}', personalInfo.education.period)
}

function detectProject(input: string): ProjectCardComponent['projectId'] | undefined {
  const text = input.toLowerCase()
  if (/已删除的经历|xrm|mmorpg|服务端/.test(text)) return 'xrm'
  if (/恋爱|lovewithme|聊天应用|全栈应用/.test(text)) return 'lovewithme'
  if (/控制台|console|总控/.test(text)) return 'aiConsole'
  return undefined
}

const RULES: LocalRule[] = [
  { keywords: ['名字', '姓名', '叫什么'], key: 'name' },
  { keywords: ['岗位', '职位', '目标'], key: 'target' },
  { keywords: ['联系方式', '联系', '邮箱', '电话', '留言'], key: 'contact', component: { type: 'ContactForm' } },
  { keywords: ['项目', '经验', '作品'], key: 'projects', component: { type: 'ProjectCard', projectId: 'xrm' } },
  { keywords: ['技能', '技术栈', '擅长', '雷达'], key: 'skills' },
  { keywords: ['教育', '学校', '学历'], key: 'education', component: { type: 'Timeline', scope: 'education' } },
  {
    keywords: ['经历', '时间线', 'timeline', '工作'],
    key: 'experience',
    component: { type: 'Timeline', scope: 'experience' },
  },
]

export function getLocalAnswer(input: string): AiMessage {
  const text = input.toLowerCase()

  const projectId = detectProject(input)
  if (projectId) {
    return {
      role: 'assistant',
      content: formatAnswer('projects'),
      component: { type: 'ProjectCard', projectId },
    }
  }

  const rule = RULES.find((item) => item.keywords.some((keyword) => text.includes(keyword)))

  if (!rule) {
    return {
      role: 'assistant',
      content: t('chat.answers.fallback' as unknown as TranslationKey).replace('{email}', personalInfo.email),
    }
  }

  return { role: 'assistant', content: formatAnswer(rule.key), component: rule.component }
}

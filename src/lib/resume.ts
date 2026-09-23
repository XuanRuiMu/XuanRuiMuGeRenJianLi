import { personalInfo } from '../data/personalInfo'
import { 求职方向 } from '../data/careerFocus'
import { t } from '../i18n/translations'

export function buildResumeMarkdown(): string {
  return `# ${personalInfo.name}

## ${t('resume.target')}
${求职方向()}

## ${t('resume.contact')}
- ${t('contact.info.email')}：${personalInfo.email}
- ${t('contact.info.phone')}：${personalInfo.phone}
- GitHub：${personalInfo.github}
- ${t('contact.info.bilibili')}：${personalInfo.bilibili}

## ${t('resume.education')}
${personalInfo.education.school} · ${personalInfo.education.major} · ${personalInfo.education.degree}
${personalInfo.education.period}
`
}

export function downloadResume(): void {
  const content = buildResumeMarkdown()
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${personalInfo.name}-${t('resume.filename')}.md`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

import { personalInfo } from '../data/personalInfo'
import { 求职方向 } from '../data/careerFocus'
import { t } from '../i18n/翻译'

export function 构建简历Markdown(): string {
  return `# ${personalInfo.name}

## ${t('resume.target')}
${求职方向()}

## ${t('resume.contact')}
- ${t('contact.info.email')}：${personalInfo.email}
- ${t('contact.info.phone')}：${personalInfo.phone}
- ${t('contact.info.github')}：${personalInfo.github}
- ${t('contact.info.bilibili')}：${personalInfo.bilibili}

## ${t('resume.education')}
${personalInfo.education.school} · ${personalInfo.education.major} · ${personalInfo.education.degree}
${personalInfo.education.period}
`
}

export function 下载简历(): void {
  const 内容 = 构建简历Markdown()
  const 数据块 = new Blob([内容], { type: 'text/markdown;charset=utf-8' })
  const 地址 = URL.createObjectURL(数据块)
  const 链接 = document.createElement('a')
  链接.href = 地址
  链接.download = `${personalInfo.name}-${t('resume.filename')}.md`
  document.body.appendChild(链接)
  链接.click()
  document.body.removeChild(链接)
  URL.revokeObjectURL(地址)
}

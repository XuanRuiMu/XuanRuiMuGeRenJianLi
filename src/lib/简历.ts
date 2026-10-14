import { 个人信息 } from '../data/个人信息'
import { 求职方向 } from '../data/职业方向'
import { t } from '../i18n/翻译'

export function 构建简历Markdown(): string {
  return `# ${个人信息.name}

## ${t('resume.target')}
${求职方向()}

## ${t('resume.contact')}
- ${t('contact.info.email')}：${个人信息.email}
- ${t('contact.info.phone')}：${个人信息.phone}
- ${t('contact.info.github')}：${个人信息.github}
- ${t('contact.info.bilibili')}：${个人信息.bilibili}

## ${t('resume.education')}
${个人信息.教育背景.school} · ${个人信息.教育背景.major} · ${个人信息.教育背景.degree}
${个人信息.教育背景.period}
`
}

export function 下载简历(): void {
  const 内容 = 构建简历Markdown()
  const 数据块 = new Blob([内容], { type: 'text/markdown;charset=utf-8' })
  const 地址 = URL.createObjectURL(数据块)
  const 链接 = document.createElement('a')
  链接.href = 地址
  链接.download = `${个人信息.name}-${t('resume.filename')}.md`
  document.body.appendChild(链接)
  链接.click()
  document.body.removeChild(链接)
  URL.revokeObjectURL(地址)
}

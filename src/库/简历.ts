import { 个人信息 } from '../数据/个人信息'
import { 求职方向 } from '../数据/职业方向'
import { t } from '../国际化/翻译'

export function 构建简历Markdown(): string {
  return `# ${个人信息.name}

## ${t('resume.target')}
${求职方向()}

## ${t('resume.contact')}
- ${t('contact.info.email')}：${个人信息.邮箱}
- ${t('contact.info.phone')}：${个人信息.电话}
- ${t('contact.info.github')}：${个人信息.GitHub}
- ${t('contact.info.bilibili')}：${个人信息.哔哩哔哩}

## ${t('resume.education')}
${个人信息.教育背景.学校} · ${个人信息.教育背景.专业} · ${个人信息.教育背景.学位}
${个人信息.教育背景.周期}
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

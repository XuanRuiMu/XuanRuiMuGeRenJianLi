import type { AI消息 } from '../状态/应用状态仓库'
import { t, type 翻译键 } from '../国际化/翻译'
import { 个人信息 } from '../数据/个人信息'
import { 求职方向 } from '../数据/职业方向'
import type { 界面组件 } from './结构化输出'
import { 是否纯问候, 是否感谢, 是否告别, 检测项目卡片, 命中兜底意图 } from './意图表'

interface 本地规则 {
  意图ID: string

  聚合意图ID?: string[]
  key: 'name' | 'target' | 'contact' | 'projects' | 'skills' | 'education' | 'experience'
  组件?: 界面组件
}

const 项目通用规则ID = 'projects-通用'

export const 规则表: 本地规则[] = [
  { 意图ID: 'name', key: 'name' },
  { 意图ID: 'target', key: 'target' },
  { 意图ID: 'contact', key: 'contact', 组件: { type: 'ContactLinks' } },
  {
    意图ID: 项目通用规则ID,
    聚合意图ID: ['projects-xrm', 'projects-爱与循环', 'projects-羊来'],
    key: 'projects',
    组件: { type: 'ProjectCard', 项目编号: 'xrm' },
  },
  { 意图ID: 'tech', key: 'skills' },
  { 意图ID: 'education', key: 'education', 组件: { type: 'Timeline', scope: 'education' } },
  {
    意图ID: 'experience',
    key: 'experience',
    组件: { type: 'Timeline', scope: 'experience' },
  },
]

function 格式化回答(key: 本地规则['key']): string {
  const 基础 = t(`chat.answers.${key}` as unknown as 翻译键)
  return 基础
    .replace('{name}', 个人信息.name)
    .replace('{direction}', 求职方向())
    .replace('{school}', 个人信息.教育背景.学校)
    .replace('{major}', 个人信息.教育背景.专业)
    .replace('{degree}', 个人信息.教育背景.学位)
    .replace('{period}', 个人信息.教育背景.周期)
}

function 命中意图(规则: 本地规则, 文本: string): boolean {
  if (命中兜底意图(规则.意图ID, 文本)) return true
  return (规则.聚合意图ID ?? []).some((意图ID) => 命中兜底意图(意图ID, 文本))
}

const 否定比较修饰: Array<{ 词: string; 疑问式?: string }> = [
  { 词: '没有', 疑问式: '有没有' },
  { 词: '没做' },
  { 词: '我没' },
  { 词: '未做' },
  { 词: '不想' },
  { 词: '不愿' },
  { 词: '无相关' },
  { 词: '哪个更' },
  { 词: '哪个重要' },
  { 词: '更重要' },
  { 词: '哪个好' },
]

function 是否否定或比较(文本: string): boolean {
  return 否定比较修饰.some(({ 词, 疑问式 }) => 文本.includes(词) && !(疑问式 && 文本.includes(疑问式)))
}

interface 回答路由 {
  key?: 本地规则['key']

  组件?: 界面组件

  组件被抑制?: boolean
}

function 路由回答(输入: string): 回答路由 {
  const 文本 = 输入.toLowerCase()
  const 否定或比较 = 是否否定或比较(文本)
  const 项目标识 = 检测项目卡片(输入)
  if (项目标识) {
    const 项目规则 = 规则表.find((规则) => 规则.意图ID === 项目通用规则ID)
    return {
      key: 项目规则?.key,
      组件: 否定或比较 ? undefined : { type: 'ProjectCard', 项目编号: 项目标识 },
      ...(否定或比较 ? { 组件被抑制: true } : {}),
    }
  }
  const 规则 = 规则表.find((项) => 命中意图(项, 文本))
  const 带组件 = 规则?.组件 !== undefined
  return {
    key: 规则?.key,
    组件: 否定或比较 ? undefined : 规则?.组件,
    ...(否定或比较 && 带组件 ? { 组件被抑制: true } : {}),
  }
}

export function 选择组件(输入: string): 界面组件 | undefined {
  return 路由回答(输入).组件
}

export function 取本地答案(输入: string): AI消息 {
  if (是否纯问候(输入) || 是否感谢(输入) || 是否告别(输入)) {
    if (是否感谢(输入)) return { role: 'assistant', content: t('chat.answers.thanks') }
    if (是否告别(输入)) return { role: 'assistant', content: t('chat.answers.farewell') }
    return { role: 'assistant', content: t('chat.answers.greeting') }
  }

  const { key, 组件, 组件被抑制 } = 路由回答(输入)
  if (!key) {
    return {
      role: 'assistant',
      content: t('chat.answers.fallback' as unknown as 翻译键),
    }
  }

  if (key === 'contact' && 组件被抑制) {
    return { role: 'assistant', content: t('chat.answers.contactNoButton' as unknown as 翻译键) }
  }
  return { role: 'assistant', content: 格式化回答(key), 组件: 组件 }
}

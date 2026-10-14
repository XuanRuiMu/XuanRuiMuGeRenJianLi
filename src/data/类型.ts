import type { TranslationKey } from '../i18n/翻译'

export interface 个人信息类型 {
  name: string
  age: number
  location: string
  phone: string
  email: string
  qq: string
  wechat: string
  github: string
  bilibili: string
  expectedCityKey: TranslationKey
  salaryKey: TranslationKey
  availabilityKey: TranslationKey
  教育背景: 教育摘要
}

export interface 教育摘要 {
  school: string
  major: string
  degree: string
  period: string
}

export interface 项目链接 {
  labelKey: TranslationKey
  url: string
}

export interface Project {
  id: string
  nameKey: TranslationKey
  descKey: TranslationKey
  tags: string[]
  links: 项目链接[]
  metricKeys?: TranslationKey[]
}

export interface 经历条目 {
  id: string
  titleKey: TranslationKey
  organizationKey?: TranslationKey
  periodKey: TranslationKey
  descriptionKeys: TranslationKey[]
  achievementKeys?: TranslationKey[]
  links?: 项目链接[]
}

export interface 课程 {
  id: string
  nameKey: TranslationKey
  levelKey: TranslationKey
}

export interface 教育背景 {
  summary: 教育摘要
  courses: 课程[]
  achievementKeys: TranslationKey[]
}

export interface 设计作品 {
  id: string
  nameKey: TranslationKey
  categoryKey: TranslationKey
  descKey: TranslationKey
}

export interface 设计 {
  headlineKey: TranslationKey
  introKey: TranslationKey
  works: 设计作品[]
  toolKeys: TranslationKey[]
}

export interface 媒体分类 {
  id: string
  labelKey: TranslationKey
  itemKeys: TranslationKey[]
}

export interface 媒体时间线事件 {
  year: string
  eventKey: TranslationKey
}

export interface 媒体 {
  headlineKey: TranslationKey
  introKey: TranslationKey
  categories: 媒体分类[]
  timeline: 媒体时间线事件[]
}

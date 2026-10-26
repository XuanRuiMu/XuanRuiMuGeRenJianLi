import type { 翻译键 } from '../国际化/翻译'

export interface 个人信息类型 {
  name: string
  年龄: number
  location: string
  电话: string
  邮箱: string
  QQ: string
  wechat: string
  GitHub: string
  哔哩哔哩: string
  期望城市键: 翻译键
  薪资键: 翻译键
  到岗状态键: 翻译键
  教育背景: 教育摘要
}

export interface 教育摘要 {
  学校: string
  专业: string
  学位: string
  周期: string
}

export interface 项目链接 {
  标签键: 翻译键
  url: string
}

export interface 项目 {
  id: string
  名称键: 翻译键
  描述键: 翻译键
  标签表: string[]
  链接表: 项目链接[]
  指标键表?: 翻译键[]
}

export interface 经历条目 {
  id: string
  标题键: 翻译键
  机构键?: 翻译键
  周期键: 翻译键
  描述键表: 翻译键[]
  成就键表?: 翻译键[]
  链接表?: 项目链接[]
}

export interface 课程 {
  id: string
  名称键: 翻译键
  级别键: 翻译键
}

export interface 教育背景 {
  摘要: 教育摘要
  课程表: 课程[]
  成就键表: 翻译键[]
}

export interface 设计作品 {
  id: string
  名称键: 翻译键
  分类键: 翻译键
  描述键: 翻译键
}

export interface 设计 {
  标题键: 翻译键
  介绍键: 翻译键
  作品表: 设计作品[]
  工具键表: 翻译键[]
}

export interface 媒体分类 {
  id: string
  标签键: 翻译键
  条目键表: 翻译键[]
}

export interface 媒体时间线事件 {
  年份: string
  事件键: 翻译键
}

export interface 媒体 {
  标题键: 翻译键
  介绍键: 翻译键
  分类表: 媒体分类[]
  时间线: 媒体时间线事件[]
}

import type { ProjectCardComponent } from './structuredOutput'

export type 项目卡片标识 = ProjectCardComponent['projectId']

export interface 共享意图定义 {
  id: string
  关键词: string[]
  boostCategories: string[]
  boostSources: string[]
}

export const 共享意图表: 共享意图定义[] = [
  {
    id: 'name',
    关键词: ['你是谁', '叫什么', '名字', '姓名', '自我介绍'],
    boostCategories: ['personalInfo'],
    boostSources: ['personalInfo.ts'],
  },
  {
    id: 'tech',
    关键词: ['最擅长', '擅长', '优势', '核心竞争力', '技术栈', '用什么技术', '技术', '技能', '会什么', '雷达'],
    boostCategories: ['techStack'],
    boostSources: ['workspace'],
  },
  {
    id: 'projects-xrm',
    关键词: ['暮澜纪元', 'xrm', 'mmorpg', '服务端'],
    boostCategories: ['projects', 'experience'],
    boostSources: ['projects.ts', 'experience.ts'],
  },
  {
    id: 'projects-爱与循环',
    关键词: ['恋爱', 'lovewithme', '聊天应用', '全栈应用', '循环工程', 'loop'],
    boostCategories: ['projects', 'experience'],
    boostSources: ['projects.ts', 'experience.ts'],
  },
  {
    id: 'projects-蜂来',
    关键词: ['蜂来', 'fenglai', '整蛊', '直播间', '点赞连击', '拖拽道具', '弹幕刷屏', '战报海报'],
    boostCategories: ['projects', 'experience'],
    boostSources: ['projects.ts', 'experience.ts'],
  },
  {
    id: 'projects-通用',
    关键词: ['项目', '作品', '做过什么'],
    boostCategories: ['projects'],
    boostSources: ['projects.ts'],
  },
  {
    id: 'experience',
    关键词: ['经历', '经验', '工作', '实习', '时间线', 'timeline'],
    boostCategories: ['experience'],
    boostSources: ['experience.ts'],
  },
  {
    id: 'education',
    关键词: ['教育', '学校', '大学', '专业', '学历'],
    boostCategories: ['education'],
    boostSources: ['personalInfo.ts', 'education.ts'],
  },
  {
    id: 'design',
    关键词: ['设计', 'ui', 'ux', 'figma', '品牌'],
    boostCategories: ['design'],
    boostSources: ['design.ts'],
  },
  {
    id: 'music',
    关键词: ['音乐', '架子鼓', '证书', '乐器'],
    boostCategories: ['music'],
    boostSources: ['music.ts'],
  },
  {
    id: 'media',
    关键词: ['媒体', '视频', 'b站', '小说', '相声', '创作'],
    boostCategories: ['media'],
    boostSources: ['media.ts'],
  },
  {
    id: 'contact',
    关键词: ['联系方式', '联系', '怎么联系', '邮箱', '电话', '手机', 'qq', '微信'],
    boostCategories: ['personalInfo'],
    boostSources: ['personalInfo.ts'],
  },
  {
    id: 'target',
    关键词: ['岗位', '职位', '目标', '求职', '期望'],
    boostCategories: ['personalInfo'],
    boostSources: ['personalInfo.ts'],
  },
]

export function 检测项目卡片(输入: string): 项目卡片标识 | undefined {
  const 文本 = 输入.toLowerCase()
  if (文本.includes('暮澜纪元') || 文本.includes('xrm') || 文本.includes('mmorpg') || 文本.includes('服务端'))
    return 'xrm'
  if (文本.includes('恋爱') || 文本.includes('lovewithme') || 文本.includes('聊天应用') || 文本.includes('全栈应用'))
    return 'lovewithme'
  if (文本.includes('蜂来') || 文本.includes('fenglai') || 文本.includes('整蛊') || 文本.includes('点赞连击'))
    return 'fengLai'
  if (文本.includes('循环工程') || 文本.includes('loop')) return 'aiConsole'
  return undefined
}

const 纯问候集合 = new Set([
  '你好',
  '您好',
  '嗨',
  '哈喽',
  'hello',
  'hi',
  'hey',
  '早上好',
  '下午好',
  '晚上好',
  '在吗',
  '你好啊',
  '您好啊',
  '你好吗',
  '您好吗',
  'hi你好',
  'hello你好',
])

export function 是否纯问候(输入: string): boolean {
  const 归一 = 输入
    .trim()
    .toLowerCase()
    .replace(/[\s,，.。!！?？~～、]+/g, '')
  if (归一.length === 0 || 归一.length > 8) return false
  return 纯问候集合.has(归一)
}

export function 是否感谢(输入: string): boolean {
  const 文本 = 输入.toLowerCase()
  return 文本.includes('谢谢') || 文本.includes('感谢') || 文本.includes('thank')
}

export function 是否告别(输入: string): boolean {
  const 文本 = 输入.toLowerCase()
  return 文本.includes('再见') || 文本.includes('拜拜') || 文本.includes('bye') || 文本.includes('晚安')
}

export function 命中共享意图(意图ID: string, 输入: string): boolean {
  const 定义 = 共享意图表.find((项) => 项.id === 意图ID)
  if (!定义) return false
  const 文本 = 输入.toLowerCase()
  return 定义.关键词.some((词) => 文本.includes(词.toLowerCase()))
}

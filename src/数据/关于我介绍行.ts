import { t, type 翻译键 } from '../国际化/翻译'

export type 片段色调 = 'plain' | 'tech' | 'dim' | 'accent'

export interface 文本片段 {
  text: string
  语气: 片段色调
}

const 行id表 = ['l1', 'l2', 'l3', 'l4', 'l5'] as const

function 行键(id: string): 翻译键 {
  return `about.introLines.${id}.text` as unknown as 翻译键
}

const 片段正则 = /\{\{(tech|dim|accent)\|([^}]*)\}\}/g

export function 解析片段(原文: string): 文本片段[] {
  const 片段表: 文本片段[] = []
  let 上次 = 0
  for (const 匹配 of 原文.matchAll(片段正则)) {
    const 起 = 匹配.index ?? 0
    if (起 > 上次) 片段表.push({ text: 原文.slice(上次, 起), 语气: 'plain' })
    片段表.push({ text: 匹配[2] ?? '', 语气: (匹配[1] as 片段色调) ?? 'plain' })
    上次 = 起 + 匹配[0].length
  }
  if (上次 < 原文.length) 片段表.push({ text: 原文.slice(上次), 语气: 'plain' })
  return 片段表.filter((段) => 段.text.length > 0)
}

export function 关于我介绍行(): 文本片段[][] {
  return 行id表.map((id) => 解析片段(t(行键(id))))
}

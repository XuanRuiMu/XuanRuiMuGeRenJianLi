import { t, type TranslationKey } from '../i18n/translations'

/**
 * 「关于我」正文行：文案在 zh-CN.json 的 about.introLines 节点。
 * 行内支持 {{tech|…}} / {{dim|…}} / {{accent|…}} 片段标记，由 AboutSection 解析成着色 span。
 * id 表顺序即展示顺序。
 */

export type 片段色调 = 'plain' | 'tech' | 'dim' | 'accent'

export interface 文本片段 {
  text: string
  tone: 片段色调
}

/** 展示顺序 */
const 行id表 = ['l1', 'l2', 'l3', 'l4', 'l5'] as const

function 行键(id: string): TranslationKey {
  return `about.introLines.${id}.text` as unknown as TranslationKey
}

const 片段正则 = /\{\{(tech|dim|accent)\|([^}]*)\}\}/g

/** 把带 {{tone|…}} 标记的原文拆成着色片段 */
export function 解析片段(原文: string): 文本片段[] {
  const 片段表: 文本片段[] = []
  let 上次 = 0
  for (const 匹配 of 原文.matchAll(片段正则)) {
    const 起 = 匹配.index ?? 0
    if (起 > 上次) 片段表.push({ text: 原文.slice(上次, 起), tone: 'plain' })
    片段表.push({ text: 匹配[2] ?? '', tone: (匹配[1] as 片段色调) ?? 'plain' })
    上次 = 起 + 匹配[0].length
  }
  if (上次 < 原文.length) 片段表.push({ text: 原文.slice(上次), tone: 'plain' })
  return 片段表.filter((段) => 段.text.length > 0)
}

export function 关于我介绍行(): 文本片段[][] {
  return 行id表.map((id) => 解析片段(t(行键(id))))
}

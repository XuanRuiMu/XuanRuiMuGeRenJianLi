import { t, type TranslationKey } from '../i18n/translations'

/**
 * 「关于我」正文行：文案与样式标记都在 zh-CN.json 的 about.introLines 节点。
 * 样式由数据里的 style 字段决定，与行序号无关——增删行或调换顺序都不会让强调样式跑到别的行上。
 * 行 id 顺序即展示顺序；aboutLines.test.ts 断言 id 表与 JSON 键集一致，防止新行被漏掉。
 */

export type 关于我样式 = 'normal' | 'tech' | 'accent'

export interface 关于我行 {
  /** about.introLines 下的行 id，同时用于 React key */
  id: string
  text: string
  style: 关于我样式
}

/** 展示顺序：身份 → AI 团队协作方式（技术高亮） → AI 资产沉淀 → 工程底线（强调） → AI 之外的能力 */
const 行id表 = ['identity', 'aiTeam', 'aiAssets', 'aiBaseline', 'beyondAi'] as const

/** 样式白名单：非法值回退 normal，避免脏数据让行丢失样式或错套样式 */
const 样式白名单: readonly string[] = ['normal', 'tech', 'accent']

function 行键(id: string, 字段: 'text' | 'style'): TranslationKey {
  return `about.introLines.${id}.${字段}` as unknown as TranslationKey
}

export function 关于我介绍行(): 关于我行[] {
  const 行表: 关于我行[] = []
  for (const id of 行id表) {
    const 文本 = t(行键(id, 'text')).trim()
    if (!文本) continue
    const 原始样式 = t(行键(id, 'style'))
    行表.push({ id, text: 文本, style: 样式白名单.includes(原始样式) ? (原始样式 as 关于我样式) : 'normal' })
  }
  return 行表
}

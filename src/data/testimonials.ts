import { t, type TranslationKey } from '../i18n/translations'

/**
 * 推荐语卡片：文案全部落在 zh-CN.json 的 testimonials.items 节点，此处只保留 id 与读取逻辑。
 * id 表顺序即展示顺序；testimonials.test.ts 断言 id 表与 JSON 键集一致，防止新增条目被漏渲染。
 * 只保留两类推荐人：课程学员（论文指导）与用过其开源AI工作流模板的开发者。
 * 板块副标题与「非署名」类免责说明已按用户要求删除，不要再加回来。
 */

export interface 推荐语卡片 {
  /** testimonials.items 下的条目 id，同时用于 React key */
  id: string
  /** 推荐人头衔：身份 · 补充说明 */
  role: string
  /** 推荐语正文，空文案的条目不进入列表 */
  quote: string
  /** 推荐人身份补充说明 */
  context: string
}

/** 展示顺序：课程学员 → AI开发者 */
export const 推荐语id表 = ['student', 'aiDeveloper'] as const

function 条目键(id: string, 字段: 'role' | 'quote' | 'context'): TranslationKey {
  return `testimonials.items.${id}.${字段}` as unknown as TranslationKey
}

export function 推荐语列表(): 推荐语卡片[] {
  const 卡片表: 推荐语卡片[] = []
  for (const id of 推荐语id表) {
    const quote = t(条目键(id, 'quote')).trim()
    if (!quote) continue
    卡片表.push({ id, role: t(条目键(id, 'role')).trim(), quote, context: t(条目键(id, 'context')).trim() })
  }
  return 卡片表
}

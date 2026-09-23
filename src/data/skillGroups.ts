import { t, ta, type TranslationKey } from '../i18n/translations'

/**
 * 技能板块的两个数据源：量化指标与能力分组。
 * 文案全部落在 zh-CN.json 的 skills.metrics / skills.groups 节点，此处只保留 id 与读取逻辑。
 * id 表顺序即展示顺序；skillGroups.test.ts 断言 id 表与 JSON 键集一致，防止新增项被漏渲染。
 * 第一组固定为 AI Agent能力：技能板块对外的主航道证据。
 */

export interface 量化指标项 {
  /** skills.metrics 下的指标 id，同时用于 React key */
  id: string
  /** 带单位的展示串（如 "400+"），数字部分交给 useCountUp 滚动 */
  value: string
  label: string
}

export interface 技能组 {
  /** skills.groups 下的分组 id */
  id: string
  label: string
  description: string
  /** 能力陈述句：面试官语言，逐条可回溯到真实经历 */
  items: string[]
  /** 关键词标签：对齐岗位 JD 的检索词，只写真实掌握的 */
  tags: string[]
}

const 指标id表 = ['javaClasses', 'aiSkills', 'agentSkills', 'serverOps'] as const

const 组id表 = ['aiAgent', 'backend', 'frontend', 'delivery'] as const

function 指标键(id: string, 字段: 'value' | 'label'): TranslationKey {
  return `skills.metrics.${id}.${字段}` as unknown as TranslationKey
}

function 组键(id: string, 字段: 'label' | 'description' | 'items' | 'tags'): TranslationKey {
  return `skills.groups.${id}.${字段}` as unknown as TranslationKey
}

export function 量化指标(): 量化指标项[] {
  const 指标表: 量化指标项[] = []
  for (const id of 指标id表) {
    const value = t(指标键(id, 'value')).trim()
    const label = t(指标键(id, 'label')).trim()
    if (!value || !label) continue
    指标表.push({ id, value, label })
  }
  return 指标表
}

export function 技能组表(): 技能组[] {
  const 分组表: 技能组[] = []
  for (const id of 组id表) {
    const label = t(组键(id, 'label')).trim()
    const description = t(组键(id, 'description')).trim()
    const items = ta(组键(id, 'items'))
      .map((文本) => 文本.trim())
      .filter((文本) => 文本.length > 0)
    const tags = ta(组键(id, 'tags'))
      .map((文本) => 文本.trim())
      .filter((文本) => 文本.length > 0)
    if (!label || items.length === 0) continue
    分组表.push({ id, label, description, items, tags })
  }
  return 分组表
}

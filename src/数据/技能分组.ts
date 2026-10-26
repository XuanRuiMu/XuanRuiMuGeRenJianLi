import { t, 翻译数组, type 翻译键 } from '../国际化/翻译'

export interface 量化指标项 {
  id: string

  value: string
  标签: string
}

export interface 技能组 {
  id: string
  标签: string

  条目表: string[]

  标签表: string[]
}

const 指标id表 = ['javaClasses', 'aiSkills', 'agentSkills', 'serverOps'] as const

const 组id表 = ['aiAgent', 'backend', 'frontend', 'delivery'] as const

function 指标键(id: string, 字段: 'value' | 'label'): 翻译键 {
  return `skills.metrics.${id}.${字段}` as unknown as 翻译键
}

function 组键(id: string, 字段: 'label' | 'items' | 'tags'): 翻译键 {
  return `skills.groups.${id}.${字段}` as unknown as 翻译键
}

export function 量化指标(): 量化指标项[] {
  const 指标表: 量化指标项[] = []
  for (const id of 指标id表) {
    const value = t(指标键(id, 'value')).trim()
    const 标签 = t(指标键(id, 'label')).trim()
    if (!value || !标签) continue
    指标表.push({ id, value, 标签: 标签 })
  }
  return 指标表
}

export function 技能组表(): 技能组[] {
  const 分组表: 技能组[] = []
  for (const id of 组id表) {
    const 标签 = t(组键(id, 'label')).trim()
    const 条目表 = 翻译数组(组键(id, 'items'))
      .map((文本) => 文本.trim())
      .filter((文本) => 文本.length > 0)
    const 标签表 = 翻译数组(组键(id, 'tags'))
      .map((文本) => 文本.trim())
      .filter((文本) => 文本.length > 0)
    if (!标签 || 条目表.length === 0) continue
    分组表.push({ id, 标签, 条目表, 标签表 })
  }
  return 分组表
}

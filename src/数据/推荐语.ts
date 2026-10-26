import { t, type 翻译键 } from '../国际化/翻译'

export interface 推荐语卡片 {
  id: string

  role: string

  引用语: string

  上下文: string
}

export const 推荐语id表 = ['student', 'aiDeveloper'] as const

function 条目键(id: string, 字段: 'role' | 'quote' | 'context'): 翻译键 {
  return `testimonials.items.${id}.${字段}` as unknown as 翻译键
}

export function 推荐语列表(): 推荐语卡片[] {
  const 卡片表: 推荐语卡片[] = []
  for (const id of 推荐语id表) {
    const 引用语 = t(条目键(id, 'quote')).trim()
    if (!引用语) continue
    卡片表.push({ id, role: t(条目键(id, 'role')).trim(), 引用语, 上下文: t(条目键(id, 'context')).trim() })
  }
  return 卡片表
}

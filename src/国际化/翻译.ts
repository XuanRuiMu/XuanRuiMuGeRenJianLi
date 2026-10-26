import zhCN from './zh-CN.json'

type 嵌套键<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${嵌套键<ObjectType[Key]>}`
    : `${Key}`
}[keyof ObjectType & (string | number)]

export type 翻译键 = 嵌套键<typeof zhCN>

const 翻译表 = {
  'zh-CN': zhCN,
} as const

const 当前语言 = 'zh-CN'

export function t(key: 翻译键, 兜底?: string): string {
  const 键表 = key.split('.')
  let value: unknown = 翻译表[当前语言]

  for (const k of 键表) {
    if (value === null || typeof value !== 'object') {
      return 兜底 ?? key
    }
    value = (value as Record<string, unknown>)[k]
  }

  return typeof value === 'string' ? value : (兜底 ?? key)
}

export function 翻译数组(key: 翻译键): string[] {
  const 键表 = key.split('.')
  let value: unknown = 翻译表[当前语言]

  for (const k of 键表) {
    if (value === null || typeof value !== 'object') {
      return []
    }
    value = (value as Record<string, unknown>)[k]
  }

  return Array.isArray(value) && value.every((项) => typeof 项 === 'string') ? value : []
}

export function 填充(文本: string, 参数: Record<string, string | number>): string {
  return 文本.replace(/\{([^{}]+)\}/g, (匹配, 键名: string) =>
    Object.prototype.hasOwnProperty.call(参数, 键名) ? String(参数[键名]) : 匹配
  )
}

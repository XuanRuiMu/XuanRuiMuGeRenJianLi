import zhCN from './zh-CN.json'

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`
}[keyof ObjectType & (string | number)]

export type TranslationKey = NestedKeyOf<typeof zhCN>

const translations = {
  'zh-CN': zhCN,
} as const

const currentLocale = 'zh-CN'

export function t(key: TranslationKey, fallback?: string): string {
  const keys = key.split('.')
  let value: unknown = translations[currentLocale]

  for (const k of keys) {
    if (value === null || typeof value !== 'object') {
      return fallback ?? key
    }
    value = (value as Record<string, unknown>)[k]
  }

  return typeof value === 'string' ? value : (fallback ?? key)
}

export function ta(key: TranslationKey): string[] {
  const keys = key.split('.')
  let value: unknown = translations[currentLocale]

  for (const k of keys) {
    if (value === null || typeof value !== 'object') {
      return []
    }
    value = (value as Record<string, unknown>)[k]
  }

  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : []
}

/**
 * 翻译文本插值：把「{参数名}」占位符替换为传入值，未提供的占位符原样保留。
 * 面向玩家的动态文案一律走「翻译文件 + 插值」，禁止在调用方用模板串拼装中文。
 */
export function 填充(文本: string, 参数: Record<string, string | number>): string {
  return 文本.replace(/\{([^{}]+)\}/g, (匹配, 键名: string) =>
    Object.prototype.hasOwnProperty.call(参数, 键名) ? String(参数[键名]) : 匹配
  )
}

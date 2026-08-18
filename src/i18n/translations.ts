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

export function getCurrentLocale(): string {
  return currentLocale
}

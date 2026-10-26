import type { 翻译键 } from '../国际化/翻译'

export interface 雷达轴 {
  id: string

  level: number

  辅修?: boolean
}

export const 雷达轴表: 雷达轴[] = [
  { id: 'aiAgent', level: 85 },
  { id: 'backendArchitecture', level: 90 },
  { id: 'fullStack', level: 80 },
  { id: 'devopsDelivery', level: 78 },
  { id: 'designAesthetic', level: 70, 辅修: true },
  { id: 'artCreation', level: 65, 辅修: true },
]

export function 维度标题键(id: string): 翻译键 {
  return `data.radar.dimensions.${id}.label` as unknown as 翻译键
}

export function 维度依据键(id: string): 翻译键 {
  return `data.radar.dimensions.${id}.basis` as unknown as 翻译键
}

export function 维度描述键(id: string): 翻译键 {
  return `data.radar.dimensions.${id}.description` as unknown as 翻译键
}

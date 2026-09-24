import type { TranslationKey } from '../i18n/translations'

export interface RadarAxis {
  /** 对应 zh-CN.json 中 data.radar.dimensions.<id> 的维度 id */
  id: string
  /** 自评熟练度（0-100），依据见 data.radar.dimensions.<id>.basis */
  level: number
  /** 附轴：只画在雷达上，不进能力清单，悬停浮窗仍给出说明 */
  minor?: boolean
}

/**
 * 雷达维度顺序即绘图时的轴向顺序（从正上方顺时针）。
 * 主轴 4 条：AI Agent / 后端架构 / 全栈开发 / DevOps与实施交付——与能力清单一一对应。
 * 附轴只出现在雷达图上（设计、艺术等），不展开成介绍卡片。
 */
export const radarAxes: RadarAxis[] = [
  { id: 'aiAgent', level: 85 },
  { id: 'backendArchitecture', level: 90 },
  { id: 'fullStack', level: 80 },
  { id: 'devopsDelivery', level: 78 },
  { id: 'designAesthetic', level: 70, minor: true },
  { id: 'artCreation', level: 65, minor: true },
]

export function dimensionLabelKey(id: string): TranslationKey {
  return `data.radar.dimensions.${id}.label` as unknown as TranslationKey
}

export function dimensionBasisKey(id: string): TranslationKey {
  return `data.radar.dimensions.${id}.basis` as unknown as TranslationKey
}

export function dimensionDescriptionKey(id: string): TranslationKey {
  return `data.radar.dimensions.${id}.description` as unknown as TranslationKey
}

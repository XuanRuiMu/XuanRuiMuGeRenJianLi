import type { TranslationKey } from '../i18n/translations'

export interface RadarAxis {
  /** 对应 zh-CN.json 中 data.radar.dimensions.<id> 的维度 id */
  id: string
  /** 自评熟练度（0-100），均锚定真实可核实经历，依据见 data.radar.dimensions.<id>.basis */
  level: number
}

/**
 * 雷达维度顺序即绘图时的轴向顺序（从正上方顺时针）。
 * level 为基于真实项目的自评档位，绝不编造无依据的数值。
 */
export const radarAxes: RadarAxis[] = [
  { id: 'backendArchitecture', level: 90 },
  { id: 'aiAgent', level: 85 },
  { id: 'fullStack', level: 80 },
  { id: 'devops', level: 75 },
  { id: 'techTeaching', level: 85 },
  { id: 'designAesthetic', level: 70 },
  { id: 'musicCreation', level: 40 },
  { id: 'contentCreation', level: 75 },
]

export function dimensionLabelKey(id: string): TranslationKey {
  return `data.radar.dimensions.${id}.label` as unknown as TranslationKey
}

export function dimensionBasisKey(id: string): TranslationKey {
  return `data.radar.dimensions.${id}.basis` as unknown as TranslationKey
}

import { t } from '../i18n/translations'
import type { TranslationKey } from '../i18n/translations'
import 岗位清单原文 from '../../职业定位.txt?raw'

/**
 * 求职定位唯一数据源：方向/aria 前缀/薪资在 zh-CN.json 的 career 节点，
 * 大标题轮换岗位在项目根目录 职业定位.txt（一行一个岗位，# 开头为注释）。
 */
export const careerFocus = {
  directionKey: 'career.direction',
  roleTickerAriaKey: 'career.roleTickerAria',
  salaryKey: 'career.salary',
} as const satisfies Record<string, TranslationKey>

export function 岗位名表(): string[] {
  return 岗位清单原文
    .split('\n')
    .map((行) => 行.trim())
    .filter((行) => 行 !== '' && !行.startsWith('#'))
}

export function 求职方向(): string {
  return t(careerFocus.directionKey)
}

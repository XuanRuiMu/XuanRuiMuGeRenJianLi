import { t } from '../国际化/翻译'
import type { 翻译键 } from '../国际化/翻译'
import 岗位清单原文 from './职业定位.txt?raw'

export const 职业方向 = {
  directionKey: 'career.direction',
  roleTickerAriaKey: 'career.roleTickerAria',
  salaryKey: 'career.salary',
} as const satisfies Record<string, 翻译键>

export function 岗位名表(): string[] {
  return 岗位清单原文
    .split('\n')
    .map((行) => 行.trim())
    .filter((行) => 行 !== '' && !行.startsWith('#'))
}

export function 求职方向(): string {
  return t(职业方向.directionKey)
}

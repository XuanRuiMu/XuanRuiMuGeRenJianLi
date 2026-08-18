import type { QualityLevel } from './types'

export const QUALITY_LEVELS = {
  ULTRA: 'ultra',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const satisfies Record<string, QualityLevel>

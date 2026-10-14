import type { 画质档位值 } from './类型'

export const 画质档位 = {
  极致: 'ultra',
  高: 'high',
  中: 'medium',
  低: 'low',
} as const satisfies Record<string, 画质档位值>

export type 画质档位值 = 'ultra' | 'high' | 'medium' | 'low'

export interface 泛光设置 {
  层级数: number
  分辨率比例: number
}

export interface 景深设置 {
  分辨率比例: number
}

export interface 画质设置 {
  dpr: number | [number, number]
  粒子数量: number
  泛光: 泛光设置
  景深: 景深设置
  阴影: boolean
  后处理: boolean
  体积光: boolean
}

export interface 性能指标 {
  fcp?: number
  lcp?: number
  inp?: number
  cls?: number
  ttfb?: number
}

export interface 帧指标 {
  fps: number
  p95: number
  avg: number
  降档次数: number
  升档次数: number
}

export interface 相机目标 {
  位置: [number, number, number]
  注视点: [number, number, number]
}

export interface 帧采样 {
  时间戳: number
  增量: number
}

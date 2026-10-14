export type 画质档位值 = 'ultra' | 'high' | 'medium' | 'low'

export interface 泛光设置 {
  levels: number
  resolutionScale: number
}

export interface 景深设置 {
  resolutionScale: number
}

export interface 画质设置 {
  dpr: number | [number, number]
  particleCount: number
  bloom: 泛光设置
  dof: 景深设置
  shadows: boolean
  postProcessing: boolean
  volumetric: boolean
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
  downgradeCount: number
  upgradeCount: number
}

export interface 相机目标 {
  position: [number, number, number]
  lookAt: [number, number, number]
}

export interface 帧采样 {
  timestamp: number
  delta: number
}

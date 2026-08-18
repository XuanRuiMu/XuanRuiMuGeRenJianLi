export type QualityLevel = 'ultra' | 'high' | 'medium' | 'low'

export interface BloomSettings {
  levels: number
  resolutionScale: number
}

export interface DofSettings {
  resolutionScale: number
}

export interface QualitySettings {
  dpr: number | [number, number]
  particleCount: number
  bloom: BloomSettings
  dof: DofSettings
  shadows: boolean
  postProcessing: boolean
  volumetric: boolean
}

export interface PerformanceMetrics {
  fcp?: number
  lcp?: number
  inp?: number
  cls?: number
  ttfb?: number
}

export interface FrameMetrics {
  fps: number
  p95: number
  avg: number
  downgradeCount: number
  upgradeCount: number
}

export interface CameraTarget {
  position: [number, number, number]
  lookAt: [number, number, number]
}

export interface FrameSample {
  timestamp: number
  delta: number
}

/**
 * 设备能力评估
 * 根据硬件性能、电池状态、网络状况自动调整渲染质量
 */

import type { QualityLevel, QualitySettings } from '../domain/types'
import { QUALITY_LEVELS } from '../domain/constants'

export { QUALITY_LEVELS } from '../domain/constants'

interface GPUAdapterStub {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly features: any
}

interface NavigatorWithGPU extends Navigator {
  gpu?: {
    requestAdapter(): Promise<GPUAdapterStub | null>
  }
}

interface NetworkInformation {
  saveData?: boolean
  effectiveType?: '2g' | '3g' | '4g'
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation
  mozConnection?: NetworkInformation
  webkitConnection?: NetworkInformation
}

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number
}

interface BatteryManager {
  charging: boolean
  level: number
}

interface NavigatorWithBattery extends Navigator {
  getBattery?(): Promise<BatteryManager>
}

function getHardwareTier(): QualityLevel {
  const cores = navigator.hardwareConcurrency || 4
  const memory = (navigator as NavigatorWithMemory).deviceMemory || 8

  if (cores >= 8 && memory >= 8) return QUALITY_LEVELS.ULTRA
  if (cores >= 6 && memory >= 6) return QUALITY_LEVELS.HIGH
  if (cores >= 4 && memory >= 4) return QUALITY_LEVELS.MEDIUM
  return QUALITY_LEVELS.LOW
}

async function getBatteryTier(): Promise<QualityLevel | null> {
  const nav = navigator as NavigatorWithBattery
  if (typeof nav.getBattery === 'function') {
    try {
      const battery = await nav.getBattery()
      if (!battery.charging && battery.level < 0.25) return QUALITY_LEVELS.LOW
      if (!battery.charging && battery.level < 0.5) return QUALITY_LEVELS.MEDIUM
    } catch {
      // ignore
    }
  }
  return null
}

function getNetworkTier(): QualityLevel | null {
  const nav = navigator as NavigatorWithConnection
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection
  if (!connection) return null
  if (connection.saveData) return QUALITY_LEVELS.LOW
  if (connection.effectiveType === '4g') return QUALITY_LEVELS.HIGH
  if (connection.effectiveType === '3g') return QUALITY_LEVELS.MEDIUM
  return QUALITY_LEVELS.LOW
}

function getGPUTier(): QualityLevel | null {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return QUALITY_LEVELS.LOW

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      const lowEndKeywords = /swiftshader|software|microsoft basic render|llvmpipe/i
      if (typeof renderer === 'string' && lowEndKeywords.test(renderer)) return QUALITY_LEVELS.LOW
    }
    return null
  } catch {
    return QUALITY_LEVELS.LOW
  }
}

export async function detectWebGPUSupport(): Promise<boolean> {
  const nav = navigator as NavigatorWithGPU
  if (!nav.gpu) return false
  try {
    const adapter = await nav.gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}

export function detectWebGL2Support(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return canvas.getContext('webgl2') !== null
  } catch {
    return false
  }
}

export async function detectPerformanceProfile(): Promise<QualityLevel> {
  const hardware = getHardwareTier()
  const battery = await getBatteryTier()
  const network = getNetworkTier()
  const gpu = getGPUTier()

  const levels: QualityLevel[] = [hardware]
  if (battery) levels.push(battery)
  if (network) levels.push(network)
  if (gpu) levels.push(gpu)

  const priority: QualityLevel[] = [
    QUALITY_LEVELS.LOW,
    QUALITY_LEVELS.MEDIUM,
    QUALITY_LEVELS.HIGH,
    QUALITY_LEVELS.ULTRA,
  ]
  return levels.reduce<QualityLevel>((worst, current) => {
    return priority.indexOf(current) < priority.indexOf(worst) ? current : worst
  }, hardware)
}

export function getQualitySettings(level: QualityLevel): QualitySettings {
  const settings: Record<QualityLevel, QualitySettings> = {
    [QUALITY_LEVELS.ULTRA]: {
      dpr: [1, 2],
      particleCount: 20000,
      bloom: { levels: 8, resolutionScale: 1 },
      dof: { resolutionScale: 0.75 },
      shadows: true,
      postProcessing: true,
      volumetric: true,
    },
    [QUALITY_LEVELS.HIGH]: {
      dpr: [1, 1.5],
      particleCount: 15000,
      bloom: { levels: 6, resolutionScale: 0.75 },
      dof: { resolutionScale: 0.5 },
      shadows: true,
      postProcessing: true,
      volumetric: true,
    },
    [QUALITY_LEVELS.MEDIUM]: {
      dpr: [1, 1.25],
      particleCount: 10000,
      bloom: { levels: 4, resolutionScale: 0.5 },
      dof: { resolutionScale: 0.5 },
      shadows: false,
      postProcessing: true,
      volumetric: false,
    },
    [QUALITY_LEVELS.LOW]: {
      dpr: [1, 1],
      particleCount: 5000,
      bloom: { levels: 2, resolutionScale: 0.5 },
      dof: { resolutionScale: 0.5 },
      shadows: false,
      postProcessing: false,
      volumetric: false,
    },
  }
  return settings[level] ?? settings[QUALITY_LEVELS.HIGH]
}

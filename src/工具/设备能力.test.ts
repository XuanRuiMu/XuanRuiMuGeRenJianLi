import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 检测WebGPU支持, 检测WebGL2支持, 获取画质设置, 画质档位 } from './设备能力'

describe('deviceCapabilities', () => {
  describe('检测WebGPU支持', () => {
    it('returns false when navigator.gpu is undefined', async () => {
      Object.assign(navigator, { gpu: undefined })
      await expect(检测WebGPU支持()).resolves.toBe(false)
    })

    it('returns false when requestAdapter returns null', async () => {
      Object.assign(navigator, {
        gpu: { requestAdapter: vi.fn().mockResolvedValue(null) },
      })
      await expect(检测WebGPU支持()).resolves.toBe(false)
    })

    it('returns true when requestAdapter returns an adapter', async () => {
      Object.assign(navigator, {
        gpu: { requestAdapter: vi.fn().mockResolvedValue({ features: new Set() }) },
      })
      await expect(检测WebGPU支持()).resolves.toBe(true)
    })

    it('returns false when requestAdapter throws', async () => {
      Object.assign(navigator, {
        gpu: { requestAdapter: vi.fn().mockRejectedValue(new Error('denied')) },
      })
      await expect(检测WebGPU支持()).resolves.toBe(false)
    })
  })

  describe('检测WebGL2支持', () => {
    let originalGetContext: typeof HTMLCanvasElement.prototype.getContext

    beforeEach(() => {
      originalGetContext = HTMLCanvasElement.prototype.getContext
    })

    afterEach(() => {
      HTMLCanvasElement.prototype.getContext = originalGetContext
    })

    it('returns true when webgl2 context is available', () => {
      HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) =>
        contextId === 'webgl2' ? ({} as unknown as RenderingContext) : null
      ) as typeof originalGetContext
      expect(检测WebGL2支持()).toBe(true)
    })

    it('returns false when getContext returns null', () => {
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as typeof originalGetContext
      expect(检测WebGL2支持()).toBe(false)
    })
  })

  describe('获取画质设置', () => {
    it('returns ultra settings for ultra level', () => {
      const settings = 获取画质设置(画质档位.极致)
      expect(settings.particleCount).toBe(20000)
      expect(settings.postProcessing).toBe(true)
      expect(settings.volumetric).toBe(true)
    })

    it('returns low settings for low level', () => {
      const settings = 获取画质设置(画质档位.低)
      expect(settings.particleCount).toBe(5000)
      expect(settings.postProcessing).toBe(false)
      expect(settings.volumetric).toBe(false)
    })

    it('falls back to high settings for unknown level', () => {
      const settings = 获取画质设置('unknown' as typeof 画质档位.高)
      expect(settings.particleCount).toBe(15000)
    })

    it('returns monotonically decreasing particle counts', () => {
      const ultra = 获取画质设置(画质档位.极致).particleCount
      const high = 获取画质设置(画质档位.高).particleCount
      const medium = 获取画质设置(画质档位.中).particleCount
      const low = 获取画质设置(画质档位.低).particleCount
      expect(ultra).toBeGreaterThan(high)
      expect(high).toBeGreaterThan(medium)
      expect(medium).toBeGreaterThan(low)
    })
  })
})

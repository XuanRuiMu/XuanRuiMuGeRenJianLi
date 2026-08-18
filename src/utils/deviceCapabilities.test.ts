import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { detectWebGPUSupport, detectWebGL2Support, getQualitySettings, QUALITY_LEVELS } from './deviceCapabilities'

describe('deviceCapabilities', () => {
  describe('detectWebGPUSupport', () => {
    it('returns false when navigator.gpu is undefined', async () => {
      Object.assign(navigator, { gpu: undefined })
      await expect(detectWebGPUSupport()).resolves.toBe(false)
    })

    it('returns false when requestAdapter returns null', async () => {
      Object.assign(navigator, {
        gpu: { requestAdapter: vi.fn().mockResolvedValue(null) },
      })
      await expect(detectWebGPUSupport()).resolves.toBe(false)
    })

    it('returns true when requestAdapter returns an adapter', async () => {
      Object.assign(navigator, {
        gpu: { requestAdapter: vi.fn().mockResolvedValue({ features: new Set() }) },
      })
      await expect(detectWebGPUSupport()).resolves.toBe(true)
    })

    it('returns false when requestAdapter throws', async () => {
      Object.assign(navigator, {
        gpu: { requestAdapter: vi.fn().mockRejectedValue(new Error('denied')) },
      })
      await expect(detectWebGPUSupport()).resolves.toBe(false)
    })
  })

  describe('detectWebGL2Support', () => {
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
      expect(detectWebGL2Support()).toBe(true)
    })

    it('returns false when getContext returns null', () => {
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as typeof originalGetContext
      expect(detectWebGL2Support()).toBe(false)
    })
  })

  describe('getQualitySettings', () => {
    it('returns ultra settings for ultra level', () => {
      const settings = getQualitySettings(QUALITY_LEVELS.ULTRA)
      expect(settings.particleCount).toBe(20000)
      expect(settings.postProcessing).toBe(true)
      expect(settings.volumetric).toBe(true)
    })

    it('returns low settings for low level', () => {
      const settings = getQualitySettings(QUALITY_LEVELS.LOW)
      expect(settings.particleCount).toBe(5000)
      expect(settings.postProcessing).toBe(false)
      expect(settings.volumetric).toBe(false)
    })

    it('falls back to high settings for unknown level', () => {
      const settings = getQualitySettings('unknown' as typeof QUALITY_LEVELS.HIGH)
      expect(settings.particleCount).toBe(15000)
    })

    it('returns monotonically decreasing particle counts', () => {
      const ultra = getQualitySettings(QUALITY_LEVELS.ULTRA).particleCount
      const high = getQualitySettings(QUALITY_LEVELS.HIGH).particleCount
      const medium = getQualitySettings(QUALITY_LEVELS.MEDIUM).particleCount
      const low = getQualitySettings(QUALITY_LEVELS.LOW).particleCount
      expect(ultra).toBeGreaterThan(high)
      expect(high).toBeGreaterThan(medium)
      expect(medium).toBeGreaterThan(low)
    })
  })
})

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
    let 原始获取上下文: typeof HTMLCanvasElement.prototype.getContext

    beforeEach(() => {
      原始获取上下文 = HTMLCanvasElement.prototype.getContext
    })

    afterEach(() => {
      HTMLCanvasElement.prototype.getContext = 原始获取上下文
    })

    it('returns true when webgl2 context is available', () => {
      HTMLCanvasElement.prototype.getContext = vi.fn((上下文编号: string) =>
        上下文编号 === 'webgl2' ? ({} as unknown as RenderingContext) : null
      ) as typeof 原始获取上下文
      expect(检测WebGL2支持()).toBe(true)
    })

    it('returns false when getContext returns null', () => {
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as typeof 原始获取上下文
      expect(检测WebGL2支持()).toBe(false)
    })
  })

  describe('获取画质设置', () => {
    it('returns ultra settings for ultra level', () => {
      const 设置 = 获取画质设置(画质档位.极致)
      expect(设置.粒子数量).toBe(20000)
      expect(设置.后处理).toBe(true)
      expect(设置.体积光).toBe(true)
    })

    it('returns low settings for low level', () => {
      const 设置 = 获取画质设置(画质档位.低)
      expect(设置.粒子数量).toBe(5000)
      expect(设置.后处理).toBe(false)
      expect(设置.体积光).toBe(false)
    })

    it('falls back to high settings for unknown level', () => {
      const 设置 = 获取画质设置('unknown' as typeof 画质档位.高)
      expect(设置.粒子数量).toBe(15000)
    })

    it('returns monotonically decreasing particle counts', () => {
      const 极致 = 获取画质设置(画质档位.极致).粒子数量
      const 高 = 获取画质设置(画质档位.高).粒子数量
      const 中 = 获取画质设置(画质档位.中).粒子数量
      const 低 = 获取画质设置(画质档位.低).粒子数量
      expect(极致).toBeGreaterThan(高)
      expect(高).toBeGreaterThan(中)
      expect(中).toBeGreaterThan(低)
    })
  })
})

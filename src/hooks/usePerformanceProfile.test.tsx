import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePerformanceProfile } from './usePerformanceProfile'
import * as deviceCapabilities from '../utils/deviceCapabilities'

describe('usePerformanceProfile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts in loading state with high quality defaults', () => {
    vi.spyOn(deviceCapabilities, 'detectPerformanceProfile').mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => usePerformanceProfile())
    expect(result.current.loading).toBe(true)
    expect(result.current.level).toBe(deviceCapabilities.QUALITY_LEVELS.HIGH)
    expect(result.current.settings.particleCount).toBe(15000)
  })

  it('updates to detected quality level', async () => {
    vi.spyOn(deviceCapabilities, 'detectPerformanceProfile').mockResolvedValue(deviceCapabilities.QUALITY_LEVELS.LOW)
    const { result } = renderHook(() => usePerformanceProfile())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.level).toBe(deviceCapabilities.QUALITY_LEVELS.LOW)
    expect(result.current.settings.particleCount).toBe(5000)
  })

  it('uses ultra settings when ultra is detected', async () => {
    vi.spyOn(deviceCapabilities, 'detectPerformanceProfile').mockResolvedValue(deviceCapabilities.QUALITY_LEVELS.ULTRA)
    const { result } = renderHook(() => usePerformanceProfile())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.level).toBe(deviceCapabilities.QUALITY_LEVELS.ULTRA)
    expect(result.current.settings.particleCount).toBe(20000)
  })
})

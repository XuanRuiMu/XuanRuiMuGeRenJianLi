import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useXingNengDangWei } from './useXingNengDangWei'
import * as 设备能力 from '../utils/设备能力'

describe('useXingNengDangWei', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts in loading state with high quality defaults', () => {
    vi.spyOn(设备能力, '检测性能档位').mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useXingNengDangWei())
    expect(result.current.加载中).toBe(true)
    expect(result.current.等级).toBe(设备能力.画质档位.高)
    expect(result.current.设置.particleCount).toBe(15000)
  })

  it('updates to detected quality level', async () => {
    vi.spyOn(设备能力, '检测性能档位').mockResolvedValue(设备能力.画质档位.低)
    const { result } = renderHook(() => useXingNengDangWei())

    await waitFor(() => {
      expect(result.current.加载中).toBe(false)
    })

    expect(result.current.等级).toBe(设备能力.画质档位.低)
    expect(result.current.设置.particleCount).toBe(5000)
  })

  it('uses ultra settings when ultra is detected', async () => {
    vi.spyOn(设备能力, '检测性能档位').mockResolvedValue(设备能力.画质档位.极致)
    const { result } = renderHook(() => useXingNengDangWei())

    await waitFor(() => {
      expect(result.current.加载中).toBe(false)
    })

    expect(result.current.等级).toBe(设备能力.画质档位.极致)
    expect(result.current.设置.particleCount).toBe(20000)
  })
})

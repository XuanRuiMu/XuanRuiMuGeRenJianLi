import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const mockFetch = vi.fn()

function 包装器(client: QueryClient) {
  return function 提供者({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

/** ANALYTICS_ENABLED 是模块级常量，必须在导入前落定环境开关，测试才不受 .env.local 影响 */
async function 载入模块(开关: string) {
  vi.stubEnv('VITE_ENABLE_ANALYTICS', 开关)
  vi.resetModules()
  return await import('./api')
}

const 上报载荷 = { path: '/', referrer: '', userAgent: 'ua', timestamp: 1_700_000_000_000 }

describe('lib/api 访客统计（FP-05 公网降级）', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('开关开启且接口正常时返回统计并只请求一次', async () => {
    const { useAnalyticsStats } = await 载入模块('true')
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ total: 12, last24h: 3, stored: true }) })
    const client = new QueryClient()
    const { result } = renderHook(() => useAnalyticsStats(), {
      wrapper: 包装器(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ total: 12, last24h: 3, stored: true })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('开关关闭时不发起请求（保留 ANALYTICS_ENABLED 语义）', async () => {
    const { useAnalyticsStats } = await 载入模块('false')
    const client = new QueryClient()
    const { result } = renderHook(() => useAnalyticsStats(), { wrapper: 包装器(client) })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('404（纯静态托管无该路由）静默降级为 null，不重试不打 error 态', async () => {
    const { useAnalyticsStats } = await 载入模块('true')
    const 报错spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })
    const client = new QueryClient()
    const { result } = renderHook(() => useAnalyticsStats(), { wrapper: 包装器(client) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
    expect(result.current.isError).toBe(false)
    // 失败即重试会在无后端的生产环境上打出 4 次请求
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(报错spy).not.toHaveBeenCalled()
  })

  it('网络异常与响应体非 JSON 同样静默（SPA 回退返回 HTML 也拿不到 404）', async () => {
    const { useAnalyticsStats } = await 载入模块('true')
    const client = new QueryClient()

    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))
    const 断网 = renderHook(() => useAnalyticsStats(), { wrapper: 包装器(client) })
    await waitFor(() => expect(断网.result.current.isSuccess).toBe(true))
    expect(断网.result.current.data).toBeNull()

    client.clear()
    mockFetch.mockResolvedValue({ ok: true, json: async () => JSON.parse('<!doctype html>') })
    const 非JSON = renderHook(() => useAnalyticsStats(), { wrapper: 包装器(client) })
    await waitFor(() => expect(非JSON.result.current.isSuccess).toBe(true))
    expect(非JSON.result.current.data).toBeNull()
  })

  it('PV 上报失败不抛未捕获错误（mutateAsync 也解析为 null）', async () => {
    const { useTrackVisit } = await 载入模块('true')
    const 报错spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })
    const client = new QueryClient()
    const { result } = renderHook(() => useTrackVisit(), { wrapper: 包装器(client) })

    await expect(result.current.mutateAsync(上报载荷)).resolves.toBeNull()
    expect(result.current.isError).toBe(false)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(报错spy).not.toHaveBeenCalled()
  })

  it('PV 上报成功仍刷新统计缓存', async () => {
    const { useTrackVisit } = await 载入模块('true')
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, total: 1, last24h: 1, stored: true }) })
    const client = new QueryClient()
    const 查询spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useTrackVisit(), { wrapper: 包装器(client) })

    await result.current.mutateAsync(上报载荷)
    expect(查询spy).toHaveBeenCalledTimes(1)
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const 模拟请求 = vi.fn()

function 包装器(客户端: QueryClient) {
  return function 提供者({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={客户端}>{children}</QueryClientProvider>
  }
}

/** 访问统计开关 是模块级常量，必须在导入前落定环境开关，测试才不受 .env.local 影响 */
async function 载入模块(开关: string) {
  vi.stubEnv('VITE_ENABLE_ANALYTICS', 开关)
  vi.resetModules()
  return await import('./分析接口')
}

const 上报载荷 = { 路径: '/', 来源: '', 用户代理: 'ua', 时间戳: 1_700_000_000_000 }

describe('lib/api 访客统计（FP-05 公网降级）', () => {
  beforeEach(() => {
    模拟请求.mockReset()
    vi.stubGlobal('fetch', 模拟请求)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('开关开启且接口正常时返回统计并只请求一次', async () => {
    const { useFangWenTongJi } = await 载入模块('true')
    模拟请求.mockResolvedValue({ ok: true, json: async () => ({ 总数: 12, 近一日: 3, 已存储: true }) })
    const 客户端 = new QueryClient()
    const { result } = renderHook(() => useFangWenTongJi(), {
      wrapper: 包装器(客户端),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ 总数: 12, 近一日: 3, 已存储: true })
    expect(模拟请求).toHaveBeenCalledTimes(1)
  })

  it('开关关闭时不发起请求（保留 访问统计开关 语义）', async () => {
    const { useFangWenTongJi } = await 载入模块('false')
    const 客户端 = new QueryClient()
    const { result } = renderHook(() => useFangWenTongJi(), { wrapper: 包装器(客户端) })

    expect(result.current.fetchStatus).toBe('idle')
    expect(模拟请求).not.toHaveBeenCalled()
  })

  it('404（纯静态托管无该路由）静默降级为 null，不重试不打 error 态', async () => {
    const { useFangWenTongJi } = await 载入模块('true')
    const 报错spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    模拟请求.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })
    const 客户端 = new QueryClient()
    const { result } = renderHook(() => useFangWenTongJi(), { wrapper: 包装器(客户端) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
    expect(result.current.isError).toBe(false)
    // 失败即重试会在无后端的生产环境上打出 4 次请求
    expect(模拟请求).toHaveBeenCalledTimes(1)
    expect(报错spy).not.toHaveBeenCalled()
  })

  it('网络异常与响应体非 JSON 同样静默（SPA 回退返回 HTML 也拿不到 404）', async () => {
    const { useFangWenTongJi } = await 载入模块('true')
    const 客户端 = new QueryClient()

    模拟请求.mockRejectedValue(new TypeError('Failed to fetch'))
    const 断网 = renderHook(() => useFangWenTongJi(), { wrapper: 包装器(客户端) })
    await waitFor(() => expect(断网.result.current.isSuccess).toBe(true))
    expect(断网.result.current.data).toBeNull()

    客户端.clear()
    模拟请求.mockResolvedValue({ ok: true, json: async () => JSON.parse('<!doctype html>') })
    const 非JSON = renderHook(() => useFangWenTongJi(), { wrapper: 包装器(客户端) })
    await waitFor(() => expect(非JSON.result.current.isSuccess).toBe(true))
    expect(非JSON.result.current.data).toBeNull()
  })

  it('PV 上报失败不抛未捕获错误（mutateAsync 也解析为 null）', async () => {
    const { useShangBaoFangWen } = await 载入模块('true')
    const 报错spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    模拟请求.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })
    const 客户端 = new QueryClient()
    const { result } = renderHook(() => useShangBaoFangWen(), { wrapper: 包装器(客户端) })

    await expect(result.current.mutateAsync(上报载荷)).resolves.toBeNull()
    expect(result.current.isError).toBe(false)
    expect(模拟请求).toHaveBeenCalledTimes(1)
    expect(报错spy).not.toHaveBeenCalled()
  })

  it('PV 上报成功仍刷新统计缓存', async () => {
    const { useShangBaoFangWen } = await 载入模块('true')
    模拟请求.mockResolvedValue({ ok: true, json: async () => ({ success: true, 总数: 1, 近一日: 1, 已存储: true }) })
    const 客户端 = new QueryClient()
    const 查询spy = vi.spyOn(客户端, 'invalidateQueries')
    const { result } = renderHook(() => useShangBaoFangWen(), { wrapper: 包装器(客户端) })

    await result.current.mutateAsync(上报载荷)
    expect(查询spy).toHaveBeenCalledTimes(1)
  })
})

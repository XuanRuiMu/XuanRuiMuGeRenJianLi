import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface AnalyticsPayload {
  path: string
  referrer?: string
  userAgent?: string
  timestamp: number
}

export interface AnalyticsStats {
  total: number
  last24h: number
  stored: boolean
}

export const ANALYTICS_ENABLED = import.meta.env.VITE_ENABLE_ANALYTICS === 'true'

const ANALYTICS_KEY = ['analytics'] as const

/**
 * 统计接口请求：任何失败都静默降级为 null。
 * 生产为纯静态托管时 /api/analytics 无人应答（404 / 非 JSON），此处不抛错，
 * 以免 react-query 进入 error 态并触发默认 3 次重试（重试风暴 + 公网版控制台出现 error）。
 * 返回 null 时页脚计数保持占位「…」，不虚报 0。
 * 注：浏览器网络层自身仍会为 404 打印一条 error 日志，前端代码无法抑制；
 * 要做到零日志需按 deploy/nginx.conf 提供该路由，或构建时保持 VITE_ENABLE_ANALYTICS=false。
 */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as T
  } catch {
    return null
  }
}

export function useAnalyticsStats() {
  return useQuery({
    queryKey: ANALYTICS_KEY,
    queryFn: () => apiFetch<AnalyticsStats>('/api/analytics'),
    enabled: ANALYTICS_ENABLED,
    retry: 0,
  })
}

export function useTrackVisit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AnalyticsPayload) =>
      apiFetch<AnalyticsStats>('/api/analytics', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANALYTICS_KEY })
    },
  })
}

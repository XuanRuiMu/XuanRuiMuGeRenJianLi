import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface 访问上报载荷 {
  路径: string
  来源?: string
  用户代理?: string
  时间戳: number
}

export interface 访问统计 {
  总数: number
  近一日: number
  已存储: boolean
}

export const 访问统计开关 = import.meta.env.VITE_ENABLE_ANALYTICS === 'true'

const 访问统计查询键 = ['analytics'] as const

/**
 * 统计接口请求：任何失败都静默降级为 null。
 * 生产为纯静态托管时 /api/analytics 无人应答（404 / 非 JSON），此处不抛错，
 * 以免 react-query 进入 error 态并触发默认 3 次重试（重试风暴 + 公网版控制台出现 error）。
 * 返回 null 时页脚计数保持占位「…」，不虚报 0。
 * 注：浏览器网络层自身仍会为 404 打印一条 error 日志，前端代码无法抑制；
 * 要做到零日志需按 deploy/nginx.conf 提供该路由，或构建时保持 VITE_ENABLE_ANALYTICS=false。
 */
async function 接口请求<T>(路径: string, 选项?: RequestInit): Promise<T | null> {
  try {
    const 响应 = await fetch(路径, {
      ...选项,
      headers: {
        'Content-Type': 'application/json',
        ...(选项?.headers ?? {}),
      },
    })

    if (!响应.ok) {
      return null
    }

    return (await 响应.json()) as T
  } catch {
    return null
  }
}

export function useFangWenTongJi() {
  return useQuery({
    queryKey: 访问统计查询键,
    queryFn: () => 接口请求<访问统计>('/api/analytics'),
    enabled: 访问统计开关,
    retry: 0,
  })
}

export function useShangBaoFangWen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (载荷: 访问上报载荷) =>
      接口请求<访问统计>('/api/analytics', {
        method: 'POST',
        body: JSON.stringify(载荷),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: 访问统计查询键 })
    },
  })
}

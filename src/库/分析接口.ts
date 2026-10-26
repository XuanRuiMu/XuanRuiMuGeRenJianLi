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

interface 访问上报线格式 {
  path: string
  referrer?: string
  userAgent?: string
  timestamp: number
}

interface 访问统计线格式 {
  total: number
  last24h: number
  stored: boolean
}

export const 访问统计开关 = import.meta.env.VITE_ENABLE_ANALYTICS === 'true'

const 访问统计查询键 = ['analytics'] as const

function 转为线载荷(载荷: 访问上报载荷): 访问上报线格式 {
  return {
    path: 载荷.路径,
    referrer: 载荷.来源,
    userAgent: 载荷.用户代理,
    timestamp: 载荷.时间戳,
  }
}

function 转为统计(线数据: 访问统计线格式 | null): 访问统计 | null {
  if (线数据 === null) return null
  const { total, last24h, stored } = 线数据
  if (!Number.isFinite(total) || !Number.isFinite(last24h) || typeof stored !== 'boolean') return null
  return { 总数: total, 近一日: last24h, 已存储: stored }
}

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

async function 请求统计(路径: string, 选项?: RequestInit): Promise<访问统计 | null> {
  return 转为统计(await 接口请求<访问统计线格式>(路径, 选项))
}

export function useFangWenTongJi() {
  return useQuery({
    queryKey: 访问统计查询键,
    queryFn: () => 请求统计('/api/analytics'),
    enabled: 访问统计开关,
    retry: 0,
  })
}

export function useShangBaoFangWen() {
  const 查询客户端 = useQueryClient()

  return useMutation({
    mutationFn: (载荷: 访问上报载荷) =>
      请求统计('/api/analytics', {
        method: 'POST',
        body: JSON.stringify(转为线载荷(载荷)),
      }),
    onSuccess: () => {
      查询客户端.invalidateQueries({ queryKey: 访问统计查询键 })
    },
  })
}

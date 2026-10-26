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

/** 线上契约固定为英文键（deploy/nginx.conf 与 dev 插件一致），在此处做边界转换 */
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

/**
 * 统计接口请求：任何失败都静默降级为 null。
 * 生产为纯静态托管时 /api/analytics 无人应答（404 / 非 JSON），此处不抛错，
 * 以免 react-query 进入 error 态并触发默认 3 次重试（重试风暴 + 公网版控制台出现 error）。
 * 返回 null 时页脚计数回退到本地累计值。
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (载荷: 访问上报载荷) =>
      请求统计('/api/analytics', {
        method: 'POST',
        body: JSON.stringify(转为线载荷(载荷)),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: 访问统计查询键 })
    },
  })
}

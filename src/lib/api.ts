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

export interface ContactPayload {
  name: string
  email: string
  message: string
  website?: string
}

export interface ContactResponse {
  success: boolean
  mode?: 'sent' | 'queued' | 'ignored'
  error?: string
}

const ANALYTICS_ENABLED = import.meta.env.VITE_ENABLE_ANALYTICS === 'true'

const ANALYTICS_KEY = ['analytics'] as const

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })

  const data: unknown = await response.json()

  if (!response.ok) {
    const error =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'request_failed'
    throw new Error(error)
  }

  return data as T
}

export function useAnalyticsStats() {
  return useQuery({
    queryKey: ANALYTICS_KEY,
    queryFn: () => apiFetch<AnalyticsStats>('/api/analytics'),
    enabled: ANALYTICS_ENABLED,
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

export function useContactSubmit() {
  return useMutation({
    mutationFn: (payload: ContactPayload) =>
      apiFetch<ContactResponse>('/api/contact', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  })
}

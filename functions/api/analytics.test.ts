/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { onRequestPost, onRequestGet } from './analytics'
import { MemoryKV, createRequest, readJson } from '../test/helpers'
import type { AppEnv } from '../types'

describe('analytics edge function', () => {
  let env: AppEnv

  beforeEach(() => {
    env = { ANALYTICS_KV: new MemoryKV() }
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-07-08T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('POST returns success without storing when KV is not configured', async () => {
    const request = createRequest('POST', { path: '/', timestamp: Date.now() })
    const response = await onRequestPost({ request, env: {} })
    const data = await readJson(response)

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, stored: false })
  })

  it('POST stores event when KV is configured', async () => {
    const request = createRequest('POST', {
      path: '/about',
      referrer: 'https://example.com',
      userAgent: 'Mozilla/5.0',
      timestamp: Date.now(),
    })
    const response = await onRequestPost({ request, env })
    const data = await readJson(response)

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, stored: true })

    const stored = await env.ANALYTICS_KV?.list({ prefix: 'analytics:event:' })
    expect(stored?.keys.length).toBe(1)
  })

  it('POST anonymizes IP address', async () => {
    const request = createRequest(
      'POST',
      { path: '/', timestamp: Date.now() },
      { 'CF-Connecting-IP': '192.168.1.45' }
    )
    await onRequestPost({ request, env })

    const listResult = await env.ANALYTICS_KV?.list({ prefix: 'analytics:event:' })
    const keyName = listResult?.keys[0]?.name ?? ''
    const stored = await env.ANALYTICS_KV?.get<{ ipHash: string }>(keyName, 'json')
    expect(stored?.ipHash).toBe('192.168.1.0')
  })

  it('POST returns 400 for invalid body', async () => {
    const request = createRequest('POST', { path: '' })
    const response = await onRequestPost({ request, env })
    const data = await readJson(response)

    expect(response.status).toBe(400)
    expect(data).toMatchObject({ success: false, error: 'validation_error' })
  })

  it('GET returns zero stats when KV is not configured', async () => {
    const response = await onRequestGet({ request: createRequest('GET'), env: {} })
    const data = await readJson(response)

    expect(response.status).toBe(200)
    expect(data).toEqual({ total: 0, last24h: 0, stored: false })
  })

  it('GET returns total and last24h counts', async () => {
    const now = Date.now()
    await env.ANALYTICS_KV?.put(`analytics:event:${now - 25 * 60 * 60 * 1000}:old`, '{}')
    await env.ANALYTICS_KV?.put(`analytics:event:${now - 60 * 60 * 1000}:recent`, '{}')
    await env.ANALYTICS_KV?.put(`analytics:event:${now}:now`, '{}')

    const response = await onRequestGet({ request: createRequest('GET'), env })
    const data = await readJson(response)

    expect(data).toEqual({ total: 3, last24h: 2, stored: true })
  })
})

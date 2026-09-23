import { z } from 'zod'
import type { FunctionContext } from '../types'
import { anonymizeIP, getClientIP } from '../lib/ip'

const analyticsSchema = z.object({
  path: z.string().min(1).max(512),
  referrer: z.string().max(1024).default(''),
  userAgent: z.string().max(512).default(''),
  timestamp: z.number().int().positive(),
})

const EVENT_PREFIX = 'analytics:event:'
const ONE_DAY_MS = 24 * 60 * 60 * 1000

function summarizeUserAgent(userAgent: string): string {
  return userAgent.slice(0, 64)
}

function createEventKey(timestamp: number): string {
  const random = Math.random().toString(36).slice(2)
  return `${EVENT_PREFIX}${timestamp}:${random}`
}

export async function onRequestPost(context: FunctionContext): Promise<Response> {
  const { request, env } = context

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const parseResult = analyticsSchema.safeParse(body)
  if (!parseResult.success) {
    return new Response(
      JSON.stringify({ success: false, error: 'validation_error', issues: parseResult.error.issues }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { path, referrer, userAgent, timestamp } = parseResult.data
  const ip = getClientIP(request)
  const ipHash = await anonymizeIP(ip)
  const summary = summarizeUserAgent(userAgent)

  const stored = await (async () => {
    if (!env.ANALYTICS_KV) {
      return false
    }
    const event = { path, referrer, userAgent: summary, timestamp, ipHash }
    await env.ANALYTICS_KV.put(createEventKey(timestamp), JSON.stringify(event))
    return true
  })()

  return new Response(JSON.stringify({ success: true, stored }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function onRequestGet(context: FunctionContext): Promise<Response> {
  const { env } = context

  if (!env.ANALYTICS_KV) {
    return new Response(JSON.stringify({ total: 0, last24h: 0, stored: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const now = Date.now()
  const cutoff = now - ONE_DAY_MS

  const keys: string[] = []
  let cursor: string | undefined

  while (true) {
    const result = await env.ANALYTICS_KV.list({ prefix: EVENT_PREFIX, limit: 1000, cursor })
    keys.push(...result.keys.map((key) => key.name))
    if (result.list_complete) {
      break
    }
    cursor = result.cursor
    if (!cursor) {
      break
    }
  }

  const total = keys.length
  const last24h = keys.filter((key) => {
    const timestamp = Number(key.slice(EVENT_PREFIX.length).split(':')[0])
    return Number.isFinite(timestamp) && timestamp > cutoff
  }).length

  return new Response(JSON.stringify({ total, last24h, stored: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

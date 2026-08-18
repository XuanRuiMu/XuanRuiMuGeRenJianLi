/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { onRequestPost } from './contact'
import { MemoryKV, createRequest, readJson } from '../test/helpers'
import type { AppEnv } from '../types'

describe('contact edge function', () => {
  let env: AppEnv
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    env = { CONTACT_KV: new MemoryKV() }
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function createContactRequest(body: unknown, ip = '10.0.0.5') {
    return createRequest('POST', body, { 'CF-Connecting-IP': ip })
  }

  it('queues message when no email provider is configured', async () => {
    const request = createContactRequest({
      name: '测试',
      email: 'test@example.com',
      message: '这是一条留言。',
    })
    const response = await onRequestPost({ request, env })
    const data = await readJson(response)

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, mode: 'queued' })

    const messages = await env.CONTACT_KV?.list({ prefix: 'contact:message:' })
    expect(messages?.keys.length).toBe(1)
  })

  it('ignores honeypot submissions', async () => {
    const request = createContactRequest({
      name: '测试',
      email: 'test@example.com',
      message: '这是一条留言。',
      website: 'https://spam.example',
    })
    const response = await onRequestPost({ request, env })
    const data = await readJson(response)

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, mode: 'ignored' })

    const messages = await env.CONTACT_KV?.list({ prefix: 'contact:message:' })
    expect(messages?.keys.length).toBe(0)
  })

  it('returns 400 for invalid body', async () => {
    const request = createContactRequest({ name: '', email: 'bad', message: '' })
    const response = await onRequestPost({ request, env })
    const data = await readJson(response)

    expect(response.status).toBe(400)
    expect(data).toMatchObject({ success: false, error: 'validation_error' })
  })

  it('rate limits repeated submissions from the same IP', async () => {
    const body = { name: '测试', email: 'test@example.com', message: '留言内容。' }
    const ip = '10.0.0.7'

    for (let i = 0; i < 5; i += 1) {
      const response = await onRequestPost({ request: createContactRequest(body, ip), env })
      expect(response.status).toBe(200)
    }

    const response = await onRequestPost({ request: createContactRequest(body, ip), env })
    const data = await readJson(response)

    expect(response.status).toBe(429)
    expect(data).toEqual({ success: false, error: 'rate_limited' })
  })

  it('sends email via Resend when configured', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }))
    env.RESEND_API_KEY = 're_test'
    env.CONTACT_FROM_EMAIL = 'from@example.com'
    env.CONTACT_TO_EMAIL = 'to@example.com'

    const request = createContactRequest({
      name: '测试',
      email: 'test@example.com',
      message: '这是一条留言。',
    })
    const response = await onRequestPost({ request, env })
    const data = await readJson(response)

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, mode: 'sent' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer re_test' }),
      })
    )
  })

  it('sends email via SendGrid when configured', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 202 }))
    env.SENDGRID_API_KEY = 'SG.test'
    env.CONTACT_PROVIDER = 'sendgrid'
    env.CONTACT_FROM_EMAIL = 'from@example.com'
    env.CONTACT_TO_EMAIL = 'to@example.com'

    const request = createContactRequest({
      name: '测试',
      email: 'test@example.com',
      message: '这是一条留言。',
    })
    const response = await onRequestPost({ request, env })
    const data = await readJson(response)

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, mode: 'sent' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.sendgrid.com/v3/mail/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer SG.test' }),
      })
    )
  })

  it('falls back to queued when email provider returns error', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }))
    env.RESEND_API_KEY = 're_test'
    env.CONTACT_FROM_EMAIL = 'from@example.com'
    env.CONTACT_TO_EMAIL = 'to@example.com'

    const request = createContactRequest({
      name: '测试',
      email: 'test@example.com',
      message: '这是一条留言。',
    })
    const response = await onRequestPost({ request, env })
    const data = await readJson(response)

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, mode: 'queued' })
  })
})

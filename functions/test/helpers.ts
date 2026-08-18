import type { KVNamespace } from '../types'

export class MemoryKV implements KVNamespace {
  private store = new Map<string, { value: string; expires?: number }>()

  async get(key: string): Promise<string | null>
  async get<T>(key: string, type: 'json'): Promise<T | null>
  async get<T>(key: string, type?: 'json'): Promise<string | T | null> {
    const item = this.store.get(key)
    if (!item) {
      return null
    }
    if (item.expires && item.expires < Date.now()) {
      this.store.delete(key)
      return null
    }
    if (type === 'json') {
      try {
        return JSON.parse(item.value) as T
      } catch {
        return null
      }
    }
    return item.value
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    const expires = options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : undefined
    this.store.set(key, { value, expires })
  }

  async list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    keys: { name: string; expiration?: number }[]
    list_complete: boolean
    cursor?: string
  }> {
    const prefix = options?.prefix ?? ''
    const limit = options?.limit ?? 1000
    const keys = Array.from(this.store.keys())
      .filter((key) => key.startsWith(prefix))
      .slice(0, limit)
      .map((name) => ({ name, expiration: this.store.get(name)?.expires }))
    return { keys, list_complete: true }
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }
}

export function createRequest(method: string, body?: unknown, headers?: Record<string, string>): Request {
  return new Request('https://example.com/api/contact', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export async function readJson(response: Response): Promise<unknown> {
  return response.json()
}

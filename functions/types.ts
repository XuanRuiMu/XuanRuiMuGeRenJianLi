export interface KVNamespace {
  get(key: string): Promise<string | null>
  get<T>(key: string, type: 'json'): Promise<T | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    keys: { name: string; expiration?: number }[]
    list_complete: boolean
    cursor?: string
  }>
  delete(key: string): Promise<void>
}

export interface AppEnv {
  ANALYTICS_KV?: KVNamespace
  CONTACT_KV?: KVNamespace
  RESEND_API_KEY?: string
  SENDGRID_API_KEY?: string
  CONTACT_PROVIDER?: 'resend' | 'sendgrid'
  CONTACT_FROM_EMAIL?: string
  CONTACT_TO_EMAIL?: string
}

export interface FunctionContext {
  request: Request
  env: AppEnv
}

import { vi } from 'vitest'

export interface RegisterSWOptions {
  immediate?: boolean
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
  onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void
  onRegisterError?: (error: Error) => void
}

export type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>

export type RegisterSWFn = (options?: RegisterSWOptions) => UpdateServiceWorker

export const registerSW = vi.fn<RegisterSWFn>(() => vi.fn() as UpdateServiceWorker)

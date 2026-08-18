import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerSW, type RegisterSWOptions } from 'virtual:pwa-register'
import { useAppStore } from './store/useAppStore'

const mockedRegisterSW = registerSW as ReturnType<typeof vi.fn>

async function importSwRegister() {
  const module = await import('./utils/swRegister')
  return module
}

describe('PWA Service Worker registration', () => {
  beforeEach(async () => {
    useAppStore.setState({
      isOffline: false,
      updateAvailable: false,
      offlineReady: false,
      cacheQuotaWarning: false,
    })
    mockedRegisterSW.mockClear()
  })

  it('registers service worker and returns update function when supported', async () => {
    const { registerServiceWorker } = await importSwRegister()
    const updateSW = registerServiceWorker()

    expect(mockedRegisterSW).toHaveBeenCalled()
    expect(updateSW).toBeTypeOf('function')
  })

  it('sets updateAvailable when onNeedRefresh fires', async () => {
    let onNeedRefresh: (() => void) | undefined
    mockedRegisterSW.mockImplementationOnce((options?: RegisterSWOptions) => {
      onNeedRefresh = options?.onNeedRefresh
      return vi.fn()
    })

    const { registerServiceWorker } = await importSwRegister()
    registerServiceWorker()
    onNeedRefresh?.()

    expect(useAppStore.getState().updateAvailable).toBe(true)
  })

  it('sets offlineReady when onOfflineReady fires', async () => {
    let onOfflineReady: (() => void) | undefined
    mockedRegisterSW.mockImplementationOnce((options?: RegisterSWOptions) => {
      onOfflineReady = options?.onOfflineReady
      return vi.fn()
    })

    const { registerServiceWorker } = await importSwRegister()
    registerServiceWorker()
    onOfflineReady?.()

    expect(useAppStore.getState().offlineReady).toBe(true)
  })

  it('sets cacheQuotaWarning when SW posts CACHE_QUOTA_WARNING', async () => {
    const { registerServiceWorker } = await importSwRegister()
    registerServiceWorker()

    const sw = global.navigator.serviceWorker as unknown as {
      __triggerMessage: (data: unknown) => void
    }
    sw.__triggerMessage({ type: 'CACHE_QUOTA_WARNING', payload: { ratio: 0.85 } })

    expect(useAppStore.getState().cacheQuotaWarning).toBe(true)
  })
})

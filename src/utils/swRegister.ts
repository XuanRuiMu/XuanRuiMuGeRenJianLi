import { registerSW } from 'virtual:pwa-register'
import { useAppStore } from '../store/useAppStore'
import { logger } from '../observability/logger'
import { t } from '../i18n/translations'

const { setOfflineReady, setUpdateAvailable, setCacheQuotaWarning } = useAppStore.getState()

export type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>

let updateServiceWorkerImpl: UpdateServiceWorker | null = null

export async function updateServiceWorker(reloadPage = true): Promise<void> {
  if (!updateServiceWorkerImpl) return
  await updateServiceWorkerImpl(reloadPage)
}

export function registerServiceWorker(): UpdateServiceWorker | null {
  if (!('serviceWorker' in navigator)) {
    logger.info('Service Worker not supported in this environment')
    return null
  }

  updateServiceWorkerImpl = registerSW({
    immediate: true,
    onNeedRefresh() {
      logger.info('Service Worker update available')
      setUpdateAvailable(true)
    },
    onOfflineReady() {
      logger.info('Service Worker offline ready')
      setOfflineReady(true)
    },
    onRegisteredSW(swUrl, registration) {
      logger.info('Service Worker registered', { swUrl, scope: registration?.scope })
    },
    onRegisterError(error) {
      logger.warn(t('pwa.errorRegister'), { error: String(error) })
    },
  })

  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data as { type?: string; payload?: Record<string, unknown> } | undefined
    if (!data?.type) return

    switch (data.type) {
      case 'CACHE_QUOTA_WARNING':
        setCacheQuotaWarning(true)
        logger.warn('Cache quota warning', data.payload)
        break
      case 'OFFLINE_READY':
        setOfflineReady(true)
        break
      default:
        break
    }
  })

  return updateServiceWorkerImpl
}

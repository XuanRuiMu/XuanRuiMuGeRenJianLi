import { useAppStore } from '../store/useAppStore'
import { logger } from '../observability/logger'
import { t } from '../i18n/translations'

const { setOfflineReady, setUpdateAvailable, setCacheQuotaWarning } = useAppStore.getState()

export type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>

const 服务工作线程路径 = `${import.meta.env.BASE_URL}sw.js`

let updateServiceWorkerImpl: UpdateServiceWorker | null = null

export async function updateServiceWorker(reloadPage = true): Promise<void> {
  if (!updateServiceWorkerImpl) return
  await updateServiceWorkerImpl(reloadPage)
}

function bindMessageChannel(): void {
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
}

function watchForUpdates(registration: ServiceWorkerRegistration): void {
  if (registration.waiting && navigator.serviceWorker.controller) {
    logger.info('Service Worker update available')
    setUpdateAvailable(true)
    return
  }

  registration.addEventListener('updatefound', () => {
    const installing = registration.installing
    if (!installing) return
    installing.addEventListener('statechange', () => {
      if (installing.state !== 'installed') return
      if (navigator.serviceWorker.controller) {
        logger.info('Service Worker update available')
        setUpdateAvailable(true)
      } else {
        logger.info('Service Worker offline ready')
        setOfflineReady(true)
      }
    })
  })
}

export function registerServiceWorker(): UpdateServiceWorker | null {
  if (!('serviceWorker' in navigator)) {
    logger.info('Service Worker not supported in this environment')
    return null
  }

  bindMessageChannel()

  // Vite 开发服务器不注册 SW：开发期无 SW 产物，强行注册会因 MIME/404 在浏览器
  // 控制台留下无法消除的报错。用 MODE 判定：dev=development 跳过；build=production 与
  // vitest=TEST 走真实注册（import.meta.hot 在 vitest 下也为真，不能作判据）。
  if (import.meta.env.MODE === 'development') {
    return null
  }

  const applyUpdate: UpdateServiceWorker = async (reloadPage = true) => {
    const registration = await navigator.serviceWorker.getRegistration().catch(() => undefined)
    const waiting = registration?.waiting
    if (!waiting) return
    waiting.postMessage({ type: 'SKIP_WAITING' })
    if (reloadPage) {
      window.location.reload()
    }
  }
  updateServiceWorkerImpl = applyUpdate

  navigator.serviceWorker
    .register(服务工作线程路径)
    .then((registration) => {
      logger.info('Service Worker registered', { swUrl: 服务工作线程路径, scope: registration.scope })
      watchForUpdates(registration)
    })
    .catch((error: unknown) => {
      updateServiceWorkerImpl = null
      logger.warn(t('pwa.errorRegister'), { error: String(error) })
    })

  return applyUpdate
}

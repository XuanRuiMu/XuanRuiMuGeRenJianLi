import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw, CheckCircle, AlertTriangle, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { updateServiceWorker } from '../utils/swRegister'
import { usePWAStatus } from '../hooks/usePWAStatus'
import { t } from '../i18n/translations'

export function PWAStatusIndicator(): ReactNode {
  usePWAStatus()
  const isOffline = useAppStore((state) => state.isOffline)
  const updateAvailable = useAppStore((state) => state.updateAvailable)
  const offlineReady = useAppStore((state) => state.offlineReady)
  const cacheQuotaWarning = useAppStore((state) => state.cacheQuotaWarning)
  const setUpdateAvailable = useAppStore((state) => state.setUpdateAvailable)
  const setOfflineReady = useAppStore((state) => state.setOfflineReady)
  const setCacheQuotaWarning = useAppStore((state) => state.setCacheQuotaWarning)

  const [showOfflineReady, setShowOfflineReady] = useState(false)
  const [showQuotaWarning, setShowQuotaWarning] = useState(false)

  useEffect(() => {
    if (offlineReady) {
      setShowOfflineReady(true)
      const timer = window.setTimeout(() => {
        setShowOfflineReady(false)
        setOfflineReady(false)
      }, 4000)
      return () => window.clearTimeout(timer)
    }
  }, [offlineReady, setOfflineReady])

  useEffect(() => {
    if (cacheQuotaWarning) {
      setShowQuotaWarning(true)
      const timer = window.setTimeout(() => {
        setShowQuotaWarning(false)
        setCacheQuotaWarning(false)
      }, 6000)
      return () => window.clearTimeout(timer)
    }
  }, [cacheQuotaWarning, setCacheQuotaWarning])

  const handleUpdate = async () => {
    setUpdateAvailable(false)
    await updateServiceWorker(true)
  }

  const handleDismissUpdate = () => {
    setUpdateAvailable(false)
  }

  return (
    <>
      {isOffline && (
        <div
          className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur-md"
          style={{
            background: 'linear-gradient(90deg, rgba(180, 80, 60, 0.85), rgba(160, 60, 80, 0.85))',
            boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
          }}
        >
          <WifiOff size={14} />
          <span>{t('pwa.offlineDescription')}</span>
        </div>
      )}

      {updateAvailable && (
        <div
          className="fixed bottom-6 right-6 z-[60] flex items-center gap-4 px-5 py-3 rounded-2xl text-sm text-white/90 backdrop-blur-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(40, 60, 120, 0.9), rgba(80, 40, 120, 0.9))',
            border: '1px solid rgba(200, 220, 255, 0.25)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
          }}
        >
          <RefreshCw size={16} className="shrink-0" />
          <span>{t('pwa.updateAvailable')}</span>
          <button
            onClick={handleUpdate}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/15 hover:bg-white/25 transition-colors"
          >
            {t('pwa.updateButton')}
          </button>
          <button
            onClick={handleDismissUpdate}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label={t('pwa.updateLater')}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {showOfflineReady && (
        <div
          className="fixed bottom-6 left-6 z-[60] flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium text-white/90 backdrop-blur-xl"
          style={{
            background: 'rgba(30, 100, 80, 0.85)',
            border: '1px solid rgba(120, 220, 180, 0.25)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          }}
        >
          <CheckCircle size={14} />
          <span>{t('pwa.offlineReady')}</span>
        </div>
      )}

      {showQuotaWarning && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium text-white/90 backdrop-blur-xl"
          style={{
            background: 'rgba(160, 100, 40, 0.85)',
            border: '1px solid rgba(255, 200, 120, 0.25)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          }}
        >
          <AlertTriangle size={14} />
          <span>{t('pwa.cacheQuotaWarning')}</span>
        </div>
      )}
    </>
  )
}

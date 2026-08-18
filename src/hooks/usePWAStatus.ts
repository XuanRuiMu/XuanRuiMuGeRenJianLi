import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export function usePWAStatus(): void {
  const setOffline = useAppStore((state) => state.setOffline)

  useEffect(() => {
    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)

    setOffline(!navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOffline])
}

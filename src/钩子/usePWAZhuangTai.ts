import { useEffect } from 'react'
import { useYingYongZhuangTai } from '../状态/应用状态仓库'

export function usePWAZhuangTai(): void {
  const setOffline = useYingYongZhuangTai((state) => state.setOffline)

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

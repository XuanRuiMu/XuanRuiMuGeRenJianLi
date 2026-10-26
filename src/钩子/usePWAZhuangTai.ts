import { useEffect } from 'react'
import { useYingYongZhuangTai } from '../状态/应用状态仓库'

export function usePWAZhuangTai(): void {
  const 设置离线 = useYingYongZhuangTai((状态) => 状态.设置离线)

  useEffect(() => {
    const 处理上线 = () => 设置离线(false)
    const 处理离线 = () => 设置离线(true)

    设置离线(!navigator.onLine)
    window.addEventListener('online', 处理上线)
    window.addEventListener('offline', 处理离线)

    return () => {
      window.removeEventListener('online', 处理上线)
      window.removeEventListener('offline', 处理离线)
    }
  }, [设置离线])
}

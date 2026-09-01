import { useEffect, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { t } from '../../i18n/translations'
import { ANALYTICS_ENABLED, useAnalyticsStats, useTrackVisit } from '../../lib/api'

// 模块级单例：组件随主题/布局重挂载不重建缓存；本次页面加载只上报一次
// （StrictMode 双挂载、主题切换重渲染均被此标记挡下，杜绝浏览量虚增）
const 计数缓存 = new QueryClient()
let 本次加载已上报 = false

function VisitorCounterCore() {
  const stats = useAnalyticsStats()
  const trackVisit = useTrackVisit()
  const trackRef = useRef(trackVisit)
  trackRef.current = trackVisit

  useEffect(() => {
    if (本次加载已上报) return
    本次加载已上报 = true
    trackRef.current.mutate({
      path: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
    })
  }, [])

  const total = stats.data?.total
  return (
    <div className="visitor-counter-card" data-testid="visitor-counter-card">
      <span className="inline-flex items-center gap-1" data-testid="visitor-counter">
        <span aria-hidden="true">◈</span>
        {t('footer.visitorsLabel')}：{typeof total === 'number' ? total.toLocaleString('zh-CN') : '…'}
      </span>
    </div>
  )
}

/**
 * 页脚访问人数（对接后端）：
 * - 挂载即上报一次 PV（POST /api/analytics），成功后 invalidate 自动刷新计数；
 * - VITE_ENABLE_ANALYTICS 关闭时整体不渲染；
 * - 自带 QueryClientProvider，宿主无需预置 Provider。
 */
export function VisitorCounter() {
  if (!ANALYTICS_ENABLED) return null
  return (
    <QueryClientProvider client={计数缓存}>
      <VisitorCounterCore />
    </QueryClientProvider>
  )
}


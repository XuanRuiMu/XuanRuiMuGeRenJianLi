import { useEffect, useRef, useState } from 'react'
import { Eye } from 'lucide-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { t } from '../../i18n/translations'
import { ANALYTICS_ENABLED, useAnalyticsStats, useTrackVisit } from '../../lib/api'

// 模块级单例：组件随主题/布局重挂载不重建缓存；本次页面加载只上报一次
// （StrictMode 双挂载、主题切换重渲染均被此标记挡下，杜绝浏览量虚增）
const 计数缓存 = new QueryClient()
let 本次加载已上报 = false

const 本地计数键 = 'visitor-count'

function 读本地计数(): number {
  try {
    return Number(localStorage.getItem(本地计数键) ?? '0') || 0
  } catch {
    return 0
  }
}

function 记一次本地访问(): number {
  const 下一值 = 读本地计数() + 1
  try {
    localStorage.setItem(本地计数键, String(下一值))
  } catch {
    // 隐私模式等场景写入失败：仍返回内存中的递增值，保证本次展示不是空
  }
  return 下一值
}

function VisitorCounterCore() {
  const stats = useAnalyticsStats()
  const trackVisit = useTrackVisit()
  const trackRef = useRef(trackVisit)
  useEffect(() => {
    trackRef.current = trackVisit
  }, [trackVisit])

  const [本地计数, set本地计数] = useState(() => (本次加载已上报 ? 读本地计数() : 0))

  useEffect(() => {
    if (本次加载已上报) {
      set本地计数(读本地计数())
      return
    }
    本次加载已上报 = true
    set本地计数(记一次本地访问())
    if (!ANALYTICS_ENABLED) return
    trackRef.current.mutate({
      path: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
    })
  }, [])

  const total = stats.data?.total ?? 本地计数
  return (
    <div className="visitor-counter-card" data-testid="visitor-counter-card">
      <span className="inline-flex items-center gap-1.5" data-testid="visitor-counter">
        <Eye size={14} aria-hidden="true" className="visitor-counter-icon" />
        {t('footer.visitorsLabel')}：
        <span className="visitor-counter-number tabular-nums">{total.toLocaleString('zh-CN')}</span>
      </span>
    </div>
  )
}

/**
 * 页脚访问人数：
 * - 徽章始终渲染（此前 VITE_ENABLE_ANALYTICS=false 会整棵隐藏，页脚看起来像丢了访客人数）；
 * - 有后端时挂载即上报 PV（POST /api/analytics），成功后 invalidate 自动刷新计数；
 * - 无后端 / 开关关闭时用 localStorage 累计本机访问，保证页脚始终有可读数字；
 * - 自带 QueryClientProvider，宿主无需预置 Provider。
 */
export function VisitorCounter() {
  return (
    <QueryClientProvider client={计数缓存}>
      <VisitorCounterCore />
    </QueryClientProvider>
  )
}

import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { t } from '../../国际化/翻译'
import { 访问统计开关, useFangWenTongJi, useShangBaoFangWen } from '../../库/分析接口'

const 计数缓存 = new QueryClient()
let 本地计数已记 = false
let 云端已上报 = false

const 本地计数键 = 'visitor-count'

const 计数上限 = 9_999_999

function 读本地计数(): number {
  try {
    const 原值 = Number(localStorage.getItem(本地计数键) ?? '0')
    if (!Number.isFinite(原值)) return 0
    const 取整 = Math.floor(原值)
    if (取整 < 0) return 0
    return Math.min(取整, 计数上限)
  } catch {
    return 0
  }
}

function 记一次本地访问(): number {
  const 下一值 = Math.min(读本地计数() + 1, 计数上限)
  try {
    localStorage.setItem(本地计数键, String(下一值))
  } catch {}
  return 下一值
}

function FangKeJiShuHeXin() {
  const 统计 = useFangWenTongJi()
  const 记录访问 = useShangBaoFangWen()

  const [本地计数] = useState(() => {
    if (本地计数已记) return 读本地计数()
    本地计数已记 = true
    return 记一次本地访问()
  })

  useEffect(() => {
    if (云端已上报 || !访问统计开关) return
    云端已上报 = true
    记录访问.mutate({
      路径: window.location.pathname,
      来源: document.referrer,
      用户代理: navigator.userAgent,
      时间戳: Date.now(),
    })
  }, [记录访问])

  const 总计 = 统计.data?.总数 ?? 本地计数
  return (
    <div className="visitor-counter-card" data-testid="visitor-counter-card">
      <span className="inline-flex items-center gap-1.5" data-testid="visitor-counter">
        <Eye size={14} aria-hidden="true" className="visitor-counter-icon" />
        {t('footer.visitorsLabel')}：
        <span className="visitor-counter-number tabular-nums">{总计.toLocaleString('zh-CN')}</span>
      </span>
    </div>
  )
}

export function FangKeJiShu() {
  return (
    <QueryClientProvider client={计数缓存}>
      <FangKeJiShuHeXin />
    </QueryClientProvider>
  )
}

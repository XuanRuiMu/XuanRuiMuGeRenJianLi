import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { t } from '../../i18n/翻译'
import { 访问统计开关, useFangWenTongJi, useShangBaoFangWen } from '../../lib/分析接口'

// 模块级单例：组件随主题/布局重挂载不重建缓存；本次页面加载只上报一次
// （StrictMode 双挂载、主题切换重渲染均被此标记挡下，杜绝浏览量虚增）
const 计数缓存 = new QueryClient()
let 本地计数已记 = false
let 云端已上报 = false

const 本地计数键 = 'visitor-count'

/** 本地计数展示上限：非法或被篡改的 localStorage 值一律钳制回合法区间 */
const 计数上限 = 9_999_999

/** 读本地计数：外部输入（localStorage）必须校验类型、范围后才能使用 */
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
  } catch {
    // 隐私模式等场景写入失败：仍返回内存中的递增值，保证本次展示不是空
  }
  return 下一值
}

function VisitorCounterCore() {
  const stats = useFangWenTongJi()
  const trackVisit = useShangBaoFangWen()

  // 一次页面加载只累加一次：状态初始化器内完成写本地，effect 只负责云端上报，
  // 两侧都不用「effect 内同步 setState」，避免级联重渲染（react-hooks/set-state-in-effect）
  const [本地计数] = useState(() => {
    if (本地计数已记) return 读本地计数()
    本地计数已记 = true
    return 记一次本地访问()
  })

  useEffect(() => {
    if (云端已上报 || !访问统计开关) return
    云端已上报 = true
    trackVisit.mutate({
      路径: window.location.pathname,
      来源: document.referrer,
      用户代理: navigator.userAgent,
      时间戳: Date.now(),
    })
  }, [trackVisit])

  const total = stats.data?.总数 ?? 本地计数
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
export function FangKeJiShu() {
  return (
    <QueryClientProvider client={计数缓存}>
      <VisitorCounterCore />
    </QueryClientProvider>
  )
}

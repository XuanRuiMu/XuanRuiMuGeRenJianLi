import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw, CheckCircle, AlertTriangle, X } from 'lucide-react'
import { useYingYongZhuangTai } from '../状态/应用状态仓库'
import { 更新服务工作线程 } from '../工具/注册服务工作线程'
import { usePWAZhuangTai } from '../钩子/usePWAZhuangTai'
import { t } from '../国际化/翻译'

export function PWAZhuangTaiZhiShiQi(): ReactNode {
  usePWAZhuangTai()
  const 是离线 = useYingYongZhuangTai((状态) => 状态.是离线)
  const 有可用更新 = useYingYongZhuangTai((状态) => 状态.有可用更新)
  const 离线就绪 = useYingYongZhuangTai((状态) => 状态.离线就绪)
  const 缓存配额警告 = useYingYongZhuangTai((状态) => 状态.缓存配额警告)
  const 设置有更新 = useYingYongZhuangTai((状态) => 状态.设置有更新)
  const 设置离线就绪 = useYingYongZhuangTai((状态) => 状态.设置离线就绪)
  const 设置缓存告警 = useYingYongZhuangTai((状态) => 状态.设置缓存配额警告)

  const [显示离线就绪, 设置显示离线就绪] = useState(false)
  const [显示配额警告, 设置显示配额警告] = useState(false)

  useEffect(() => {
    if (离线就绪) {
      queueMicrotask(() => 设置显示离线就绪(true))
      const 定时器 = window.setTimeout(() => {
        设置显示离线就绪(false)
        设置离线就绪(false)
      }, 4000)
      return () => window.clearTimeout(定时器)
    }
  }, [离线就绪, 设置离线就绪])

  useEffect(() => {
    if (缓存配额警告) {
      queueMicrotask(() => 设置显示配额警告(true))
      const 定时器 = window.setTimeout(() => {
        设置显示配额警告(false)
        设置缓存告警(false)
      }, 6000)
      return () => window.clearTimeout(定时器)
    }
  }, [缓存配额警告, 设置缓存告警])

  const 处理更新 = async () => {
    设置有更新(false)
    await 更新服务工作线程(true)
  }

  const 处理忽略更新 = () => {
    设置有更新(false)
  }

  return (
    <>
      {是离线 && (
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

      {有可用更新 && (
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
            onClick={处理更新}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/15 hover:bg-white/25 transition-colors"
          >
            {t('pwa.updateButton')}
          </button>
          <button
            onClick={处理忽略更新}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label={t('pwa.updateLater')}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {显示离线就绪 && (
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

      {显示配额警告 && (
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

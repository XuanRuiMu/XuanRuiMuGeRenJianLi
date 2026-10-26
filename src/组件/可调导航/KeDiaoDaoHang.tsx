import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Menu, X, SlidersHorizontal } from 'lucide-react'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { 合并类名 } from '../../库/工具'
import { t, type 翻译键 } from '../../国际化/翻译'
import { useYingYongZhuangTai, type 应用板块 } from '../../状态/应用状态仓库'
import { ZhuTiQieHuan } from '../主题切换/ZhuTiQieHuan'
import { 个人信息 } from '../../数据/个人信息'

const 导航区块表: 应用板块[] = ['about', 'projects', 'skills', 'experience', 'education', 'contact']

const 滚动阈值 = 100

interface 可调导航属性 {
  className?: string
}

export function KeDiaoDaoHang({ className }: 可调导航属性) {
  const 切换区块 = useYingYongZhuangTai((状态) => 状态.切换到区块)
  const [移动菜单打开, 设置移动菜单打开] = useState(false)
  const [可见, 设置可见] = useState(false)
  const [是桌面, 设置是桌面] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  )
  const { scrollY } = useScroll()

  useEffect(() => {
    const 查询 = window.matchMedia('(min-width: 1024px)')
    const 处理变更 = (事件: MediaQueryListEvent) => 设置是桌面(事件.matches)
    查询.addEventListener('change', 处理变更)
    return () => 查询.removeEventListener('change', 处理变更)
  }, [])

  useMotionValueEvent(scrollY, 'change', (最新) => {
    设置可见(最新 > 滚动阈值)
  })

  const 跳转 = (区块: 应用板块) => {
    设置移动菜单打开(false)
    切换区块(区块)
  }

  const 标志 = (
    <button
      type="button"
      onClick={() => 跳转('hero')}
      className="relative z-20 flex shrink-0 cursor-pointer items-center"
      aria-label={t('nav.hero')}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#7dd3fc] via-[#38bdf8] to-[#0c4a6e] font-display text-xl font-bold text-white shadow-[0_0_16px_rgba(56,189,248,0.35)]">
        {个人信息.name.charAt(0)}
      </span>
    </button>
  )

  const 特效面板触发器 = (
    <div id="starry-gui-root" className="relative z-20 shrink-0">
      <button
        id="starry-gui-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-label={t('starryBg.panelTrigger')}
        title={t('starryBg.panelTrigger')}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text-primary transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <SlidersHorizontal size={16} />
      </button>
    </div>
  )

  const 特效面板插槽 =
    typeof document !== 'undefined'
      ? createPortal(
          <div
            id="starry-gui-slot"
            className="fixed z-[1000] hidden w-[300px] overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
          />,
          document.body
        )
      : null

  const 导航链接胶囊 = (区块: 应用板块, 额外类名?: string) => (
    <button
      key={区块}
      type="button"
      onClick={() => 跳转(区块)}
      className={合并类名('nav-link-pill cursor-pointer px-4 py-2 text-sm font-medium', 额外类名)}
    >
      {t(`nav.${区块}` as 翻译键)}
    </button>
  )

  return (
    <div className={合并类名('fixed inset-x-0 top-0 z-50 w-full pt-2', className)}>
      <motion.div
        animate={{
          backdropFilter: 可见 ? 'blur(16px) saturate(180%)' : 'none',
          boxShadow: 可见
            ? '0 8px 32px rgba(12, 74, 110, 0.3), 0 4px 16px rgba(12, 74, 110, 0.2), 0 0 0 1px rgba(125, 211, 252, 0.1), 0 1px 0 rgba(255, 255, 255, 0.05) inset'
            : 'none',
          width: 可见 ? (是桌面 ? '40%' : '90%') : '100%',
          y: 可见 ? 20 : 0,
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 50 }}
        style={{ minWidth: 'min(800px, 100%)' }}
        className={合并类名(
          'glass-nav relative z-[60] mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-row items-center justify-between self-start rounded-full px-4 py-2 lg:max-w-7xl',
          可见 && 'shadow-lg'
        )}
      >
        <div className="relative z-20 flex shrink-0 items-center gap-2">
          {标志}
          {特效面板触发器}
        </div>
        {特效面板插槽}

        <div className="absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-2 lg:flex">
          {导航区块表.map((区块) => 导航链接胶囊(区块))}
        </div>

        <div className="relative z-20 ml-auto flex items-center gap-2">
          <ZhuTiQieHuan />
          <button
            type="button"
            onClick={() => 设置移动菜单打开(!移动菜单打开)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
            aria-expanded={移动菜单打开}
            aria-label={t('nav.main')}
          >
            {移动菜单打开 ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </motion.div>

      {}
      <AnimatePresence>
        {移动菜单打开 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-50 mx-auto mt-2 flex w-full max-w-[calc(100vw-2rem)] flex-col items-center justify-start gap-4 rounded-3xl border border-emerald-500/20 bg-slate-900/85 px-4 py-8 shadow-lg shadow-slate-900/30 backdrop-blur-md lg:hidden"
          >
            {导航区块表.map((区块) => 导航链接胶囊(区块, 'w-full px-6 py-3 text-center'))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

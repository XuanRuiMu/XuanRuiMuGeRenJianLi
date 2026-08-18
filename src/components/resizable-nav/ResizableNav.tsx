import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Menu, X, SlidersHorizontal } from 'lucide-react'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { cn } from '../../lib/utils'
import { t, type TranslationKey } from '../../i18n/translations'
import { useAppStore, type AppSection } from '../../store/useAppStore'
import { ThemeToggle } from '../theme-toggle/ThemeToggle'
import { personalInfo } from '../../data/personalInfo'

/** 中部导航锚点（联系与其他分区同款胶囊并列居中） */
const NAV_SECTIONS: AppSection[] = ['about', 'projects', 'experience', 'education', 'contact']

const SCROLL_THRESHOLD = 100

interface ResizableNavProps {
  className?: string
}

/**
 * 顶部菜单栏 · 移植自 12-next-spline-3d 的 resizable-navbar。
 * 页面顶部完全展开，滚动超过 100px 后收缩为 40% 宽（min 800px）并叠加毛玻璃与投影；
 * 桌面端胶囊导航居中，窄屏折叠为汉堡下拉（emerald 毛玻璃面板）。
 */
export function ResizableNav({ className }: ResizableNavProps) {
  const transitionToSection = useAppStore((state) => state.transitionToSection)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  )
  const { scrollY } = useScroll()

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const handleChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setVisible(latest > SCROLL_THRESHOLD)
  })

  const goTo = (section: AppSection) => {
    setIsMobileMenuOpen(false)
    transitionToSection(section)
  }

  const logo = (
    <button
      type="button"
      onClick={() => goTo('hero')}
      className="relative z-20 flex shrink-0 cursor-pointer items-center"
      aria-label={t('nav.hero')}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#7dd3fc] via-[#38bdf8] to-[#0c4a6e] font-display text-xl font-bold text-white shadow-[0_0_16px_rgba(56,189,248,0.35)]">
        {personalInfo.name.charAt(0)}
      </span>
    </button>
  )

  const effectsPanelTrigger = (
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

  // 根因修复（特效面板定位）：#starry-gui-slot 使用 position:fixed，但原本嵌套在
  // framer-motion 的 glass-nav（含 transform / backdrop-filter）内 —— 该变换/滤镜祖先会成为
  // fixed 的包含块，使按视口坐标计算的 left/top 被解释为相对祖先，导致面板落点错位
  // （菜单收起时偏移约 240px，表现为“乱跑”）。将其渲染到 document.body（无任何变换/滤镜祖先），
  // position:fixed 重新相对视口定位，落点恒等于鼠标点击的视口坐标，与菜单展开/收起状态无关。
  const effectsPanelSlot =
    typeof document !== 'undefined'
      ? createPortal(
          <div
            id="starry-gui-slot"
            className="fixed z-[1000] hidden w-[300px] overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
          />,
          document.body
        )
      : null

  const navLinkPill = (section: AppSection, extraClassName?: string) => (
    <button
      key={section}
      type="button"
      onClick={() => goTo(section)}
      className={cn('nav-link-pill cursor-pointer px-4 py-2 text-sm font-medium', extraClassName)}
    >
      {t(`nav.${section}` as TranslationKey)}
    </button>
  )

  return (
    <div className={cn('fixed inset-x-0 top-0 z-50 w-full pt-2', className)}>
      <motion.div
        animate={{
          backdropFilter: visible ? 'blur(16px) saturate(180%)' : 'none',
          boxShadow: visible
            ? '0 8px 32px rgba(12, 74, 110, 0.3), 0 4px 16px rgba(12, 74, 110, 0.2), 0 0 0 1px rgba(125, 211, 252, 0.1), 0 1px 0 rgba(255, 255, 255, 0.05) inset'
            : 'none',
          width: visible ? (isDesktop ? '40%' : '90%') : '100%',
          y: visible ? 20 : 0,
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 50 }}
        style={{ minWidth: 'min(800px, 100%)' }}
        className={cn(
          'glass-nav relative z-[60] mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-row items-center justify-between self-start rounded-full px-4 py-2 lg:max-w-7xl',
          visible && 'shadow-lg'
        )}
      >
        <div className="relative z-20 flex shrink-0 items-center gap-2">
          {logo}
          {effectsPanelTrigger}
        </div>
        {effectsPanelSlot}

        <div className="absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-2 lg:flex">
          {NAV_SECTIONS.map((section) => navLinkPill(section))}
        </div>

        <div className="relative z-20 ml-auto flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
            aria-expanded={isMobileMenuOpen}
            aria-label={t('nav.main')}
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </motion.div>

      {/* 窄屏下拉菜单（emerald 毛玻璃面板） */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-50 mx-auto mt-2 flex w-full max-w-[calc(100vw-2rem)] flex-col items-center justify-start gap-4 rounded-3xl border border-emerald-500/20 bg-slate-900/85 px-4 py-8 shadow-lg shadow-slate-900/30 backdrop-blur-md lg:hidden"
          >
            {NAV_SECTIONS.map((section) => navLinkPill(section, 'w-full px-6 py-3 text-center'))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

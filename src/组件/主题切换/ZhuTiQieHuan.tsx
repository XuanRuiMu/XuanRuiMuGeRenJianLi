import { useEffect, useId, useRef, useState } from 'react'
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useZhuTiXiTong } from './useZhuTiXiTong'
import { 合并类名 } from '../../库/工具'
import { t } from '../../国际化/翻译'
import type { 应用主题 } from '../../状态/应用状态仓库'

const 主题表: 应用主题[] = ['dark', 'light', 'system']

const 图标表: Record<应用主题, typeof Sun> = {
  dark: Moon,
  light: Sun,
  system: Monitor,
}

const 主题标签: Record<应用主题, string> = {
  dark: t('theme.dark'),
  light: t('theme.light'),
  system: t('theme.system'),
}

interface 主题选项 {
  value: 应用主题
  图标: typeof Sun
  标签: string
}

const 选项表: 主题选项[] = 主题表.map((value) => ({
  value,
  图标: 图标表[value],
  标签: 主题标签[value],
}))

interface 主题切换属性 {
  className?: string
}

export function ZhuTiQieHuan({ className }: 主题切换属性) {
  const { theme: 主题, setTheme: 设置主题 } = useZhuTiXiTong()
  const [open, 设置展开] = useState(false)
  const [活跃下标, 设置活跃下标] = useState(0)
  const 容器引用 = useRef<HTMLDivElement>(null)
  const 触发器引用 = useRef<HTMLButtonElement>(null)
  const 选项引用表 = useRef<(HTMLButtonElement | null)[]>([])
  const 列表框编号 = useId()
  const DangQianTuBiao = 图标表[主题]
  const 当前下标 = 选项表.findIndex((选项) => 选项.value === 主题)

  const 处理选择 = (事件: React.MouseEvent<HTMLButtonElement>, value: 应用主题) => {
    事件.stopPropagation()
    if (value !== 主题) {
      设置主题(value, { origin: { 横: 事件.clientX, 纵: 事件.clientY } })
    }
    设置展开(false)
    触发器引用.current?.focus()
  }

  const 处理按键 = (事件: React.KeyboardEvent) => {
    if (!open) {
      if (事件.key === 'Enter' || 事件.key === ' ' || 事件.key === 'ArrowDown') {
        事件.preventDefault()
        设置展开(true)
        设置活跃下标(当前下标 >= 0 ? 当前下标 : 0)
      }
      return
    }

    switch (事件.key) {
      case 'Escape':
        事件.preventDefault()
        设置展开(false)
        触发器引用.current?.focus()
        break
      case 'ArrowDown':
        事件.preventDefault()
        设置活跃下标((上一个) => (上一个 + 1) % 选项表.length)
        break
      case 'ArrowUp':
        事件.preventDefault()
        设置活跃下标((上一个) => (上一个 - 1 + 选项表.length) % 选项表.length)
        break
      case 'Home':
        事件.preventDefault()
        设置活跃下标(0)
        break
      case 'End':
        事件.preventDefault()
        设置活跃下标(选项表.length - 1)
        break
      case 'Enter':
      case ' ':
        事件.preventDefault()
        按索引选择(活跃下标)
        break
      case 'Tab':
        设置展开(false)
        break
    }
  }

  const 按索引选择 = (下标: number) => {
    const 选项 = 选项表[下标]
    if (选项.value !== 主题) {
      const 元素 = 选项引用表.current[下标]
      const 矩形 = 元素?.getBoundingClientRect()
      const 来源 = 矩形
        ? { 横: 矩形.left + 矩形.width / 2, 纵: 矩形.top + 矩形.height / 2 }
        : { 横: window.innerWidth / 2, 纵: window.innerHeight / 2 }
      设置主题(选项.value, { origin: 来源 })
    }
    设置展开(false)
    触发器引用.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const 处理外部点击 = (事件: MouseEvent) => {
      if (容器引用.current && !容器引用.current.contains(事件.target as Node)) {
        设置展开(false)
      }
    }
    const 处理外部聚焦 = (事件: FocusEvent) => {
      if (容器引用.current && !容器引用.current.contains(事件.relatedTarget as Node)) {
        设置展开(false)
      }
    }
    document.addEventListener('mousedown', 处理外部点击)
    document.addEventListener('focusout', 处理外部聚焦)
    return () => {
      document.removeEventListener('mousedown', 处理外部点击)
      document.removeEventListener('focusout', 处理外部聚焦)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      选项引用表.current[活跃下标]?.focus()
    }
  }, [open, 活跃下标])

  return (
    <div ref={容器引用} className={合并类名('relative', className)}>
      <button
        ref={触发器引用}
        type="button"
        onClick={() => {
          设置展开((上一个) => !上一个)
          设置活跃下标(当前下标 >= 0 ? 当前下标 : 0)
        }}
        onKeyDown={处理按键}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={列表框编号}
        aria-label={t('theme.select')}
        className={合并类名(
          'inline-flex h-9 items-center gap-1.5 rounded-full pl-3 pr-2',
          'bg-surface text-text-primary border border-border',
          'transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        )}
      >
        <DangQianTuBiao size={16} />
        <ChevronDown
          size={14}
          className={合并类名('text-muted transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={列表框编号}
            role="listbox"
            aria-label={t('theme.select')}
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={合并类名(
              'absolute right-0 top-full z-50 mt-2 min-w-[10rem] overflow-hidden rounded-2xl',
              'border border-border bg-surface p-1.5 shadow-lg'
            )}
          >
            {选项表.map((选项, 下标) => {
              const TuBiaoZuJian = 选项.图标
              const selected = 选项.value === 主题
              return (
                <button
                  key={选项.value}
                  ref={(元素) => {
                    选项引用表.current[下标] = 元素
                  }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  tabIndex={-1}
                  onClick={(事件) => 处理选择(事件, 选项.value)}
                  onKeyDown={处理按键}
                  onMouseEnter={() => 设置活跃下标(下标)}
                  className={合并类名(
                    'relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm',
                    'text-text-primary transition-colors focus-visible:outline-none',
                    selected ? 'font-medium' : 'hover:text-text-primary'
                  )}
                >
                  {selected && (
                    <motion.div
                      layoutId="theme-active-indicator"
                      className="absolute inset-0 rounded-xl bg-primary/10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-surface-elevated">
                    <TuBiaoZuJian size={14} />
                  </span>
                  <span className="relative z-10">{选项.标签}</span>
                  {selected && <span className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

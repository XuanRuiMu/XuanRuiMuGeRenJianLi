import { useEffect, useId, useRef, useState } from 'react'
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useThemeSystem } from './useThemeSystem'
import { cn } from '../../lib/utils'
import { t } from '../../i18n/translations'
import type { AppTheme } from '../../store/useAppStore'

const THEMES: AppTheme[] = ['dark', 'light', 'system']

const ICONS: Record<AppTheme, typeof Sun> = {
  dark: Moon,
  light: Sun,
  system: Monitor,
}

const THEME_LABEL: Record<AppTheme, string> = {
  dark: t('theme.dark'),
  light: t('theme.light'),
  system: t('theme.system'),
}

interface ThemeOption {
  value: AppTheme
  icon: typeof Sun
  label: string
}

const OPTIONS: ThemeOption[] = THEMES.map((value) => ({
  value,
  icon: ICONS[value],
  label: THEME_LABEL[value],
}))

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useThemeSystem()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const listboxId = useId()
  const CurrentIcon = ICONS[theme]
  const currentIndex = OPTIONS.findIndex((option) => option.value === theme)

  const handleSelect = (event: React.MouseEvent<HTMLButtonElement>, value: AppTheme) => {
    event.stopPropagation()
    if (value !== theme) {
      setTheme(value, { origin: { x: event.clientX, y: event.clientY } })
    }
    setOpen(false)
    triggerRef.current?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault()
        setOpen(true)
        setActiveIndex(currentIndex >= 0 ? currentIndex : 0)
      }
      return
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
        break
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((prev) => (prev + 1) % OPTIONS.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((prev) => (prev - 1 + OPTIONS.length) % OPTIONS.length)
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(OPTIONS.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        handleSelectByIndex(activeIndex)
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  const handleSelectByIndex = (index: number) => {
    const option = OPTIONS[index]
    if (option.value !== theme) {
      const element = optionRefs.current[index]
      const rect = element?.getBoundingClientRect()
      const origin = rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      setTheme(option.value, { origin })
    }
    setOpen(false)
    triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleFocusOutside = (event: FocusEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.relatedTarget as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('focusout', handleFocusOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('focusout', handleFocusOutside)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      optionRefs.current[activeIndex]?.focus()
    }
  }, [open, activeIndex])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((prev) => !prev)
          setActiveIndex(currentIndex >= 0 ? currentIndex : 0)
        }}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={t('theme.select')}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-full pl-3 pr-2',
          'bg-surface text-text-primary border border-border',
          'transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        )}
      >
        <CurrentIcon size={16} />
        <ChevronDown size={14} className={cn('text-muted transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={listboxId}
            role="listbox"
            aria-label={t('theme.select')}
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'absolute right-0 top-full z-50 mt-2 min-w-[10rem] overflow-hidden rounded-2xl',
              'border border-border bg-surface p-1.5 shadow-lg'
            )}
          >
            {OPTIONS.map((option, index) => {
              const Icon = option.icon
              const selected = option.value === theme
              return (
                <button
                  key={option.value}
                  ref={(el) => {
                    optionRefs.current[index] = el
                  }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  tabIndex={-1}
                  onClick={(event) => handleSelect(event, option.value)}
                  onKeyDown={handleKeyDown}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
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
                    <Icon size={14} />
                  </span>
                  <span className="relative z-10">{option.label}</span>
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

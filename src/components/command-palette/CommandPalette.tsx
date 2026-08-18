import { useEffect, useCallback } from 'react'
import { Command } from 'cmdk'
import { Search, Sun, Moon, Monitor, MessageSquare, Mail, Link, Download } from 'lucide-react'
import { useAppStore, SECTION_ORDER, type AppSection, type AppTheme } from '../../store/useAppStore'
import { useThemeSystem } from '../theme-toggle/useThemeSystem'
import { t, type TranslationKey } from '../../i18n/translations'
import { personalInfo } from '../../data/personalInfo'
import { downloadResume } from '../../lib/resume'
import { cn } from '../../lib/utils'
import { startViewTransition } from '../../utils/viewTransition'

function sectionLabel(section: AppSection): string {
  return t(`nav.${section}` as unknown as TranslationKey)
}

export function CommandPalette() {
  const open = useAppStore((state) => state.commandOpen)
  const setOpen = useAppStore((state) => state.setCommandOpen)
  const toggleChat = useAppStore((state) => state.toggleChat)
  const transitionToSection = useAppStore((state) => state.transitionToSection)
  const { theme, setTheme } = useThemeSystem()

  const setOpenWithTransition = useCallback(
    (value: boolean) => {
      if (value) {
        startViewTransition(() => {
          setOpen(value)
        })
      } else {
        setOpen(value)
      }
    },
    [setOpen]
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpenWithTransition(!open)
      }
      if (event.key === 'Escape') {
        setOpenWithTransition(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, setOpenWithTransition])

  const run = useCallback(
    (action: () => void) => {
      action()
      setOpenWithTransition(false)
    },
    [setOpenWithTransition]
  )

  const toggleTheme = useCallback(() => {
    const next: AppTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
    setTheme(next)
  }, [theme, setTheme])

  const copyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(personalInfo.email)
    } catch {
      // ignore clipboard errors
    }
  }, [])

  const copyGithub = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(personalInfo.github)
    } catch {
      // ignore clipboard errors
    }
  }, [])

  const handleDownloadResume = useCallback(() => {
    downloadResume()
  }, [])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 p-4 pt-[15vh] backdrop-blur-sm"
      onClick={() => setOpenWithTransition(false)}
      role="dialog"
      aria-modal="true"
      aria-label={t('command.title')}
      style={{ viewTransitionName: 'command-palette' }}
    >
      <Command
        className={cn('w-full max-w-xl overflow-hidden rounded-2xl border border-border', 'bg-surface shadow-2xl')}
        onClick={(event) => event.stopPropagation()}
        label={t('command.title')}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search size={18} className="text-muted" />
          <Command.Input
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-muted"
            placeholder={t('command.placeholder')}
          />
          <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted sm:inline-block">
            ESC
          </kbd>
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin">
          <Command.Empty className="px-4 py-6 text-center text-sm text-muted">{t('command.empty')}</Command.Empty>
          <Command.Group heading={t('command.sections')} className="px-2 py-2 text-xs font-medium text-muted">
            {SECTION_ORDER.map((section) => (
              <Command.Item
                key={section}
                value={`section-${section} ${sectionLabel(section)}`}
                onSelect={() => run(() => transitionToSection(section))}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-text-primary transition-colors hover:bg-surface-elevated aria-selected:bg-surface-elevated"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {sectionLabel(section)}
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading={t('command.actions')} className="px-2 py-2 text-xs font-medium text-muted">
            <Command.Item
              value={t('command.toggleTheme')}
              onSelect={() => run(toggleTheme)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-text-primary transition-colors hover:bg-surface-elevated aria-selected:bg-surface-elevated"
            >
              {theme === 'dark' ? <Moon size={16} /> : theme === 'light' ? <Sun size={16} /> : <Monitor size={16} />}
              {t('command.toggleTheme')}
            </Command.Item>
            <Command.Item
              value={t('command.copyEmail')}
              onSelect={() => run(copyEmail)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-text-primary transition-colors hover:bg-surface-elevated aria-selected:bg-surface-elevated"
            >
              <Mail size={16} />
              {t('command.copyEmail')}
            </Command.Item>
            <Command.Item
              value={t('command.copyGithub')}
              onSelect={() => run(copyGithub)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-text-primary transition-colors hover:bg-surface-elevated aria-selected:bg-surface-elevated"
            >
              <Link size={16} />
              {t('command.copyGithub')}
            </Command.Item>
            <Command.Item
              value={t('command.openChat')}
              onSelect={() => run(toggleChat)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-text-primary transition-colors hover:bg-surface-elevated aria-selected:bg-surface-elevated"
            >
              <MessageSquare size={16} />
              {t('command.openChat')}
            </Command.Item>
            <Command.Item
              value={t('command.downloadResume')}
              onSelect={() => run(handleDownloadResume)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-text-primary transition-colors hover:bg-surface-elevated aria-selected:bg-surface-elevated"
            >
              <Download size={16} />
              {t('command.downloadResume')}
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  )
}

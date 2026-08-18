import { type ReactNode } from 'react'
import { ResizableNav } from '../components/resizable-nav/ResizableNav'
import { CommandPalette } from '../components/command-palette/CommandPalette'
import { AIChat } from '../components/ai-chat/AIChat'
import { PWAStatusIndicator } from '../components/PWAStatusIndicator'
import { StarryGalaxyBackground, InkRevealOverlay } from '../components/starry-background'
import { t } from '../i18n/translations'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-bg text-text-primary">
      <StarryGalaxyBackground className="z-0" />
      <InkRevealOverlay />
      <div className="relative z-10 flex min-h-screen flex-col">
        <PWAStatusIndicator />
        <ResizableNav />

        <main className="relative z-10 flex-1 pt-16">{children}</main>

        <footer className="border-t border-border px-4 py-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-xs text-muted text-shadow-readable sm:flex-row">
            <span>{t('footer.copyright')}</span>
            <span>{t('footer.status')}</span>
          </div>
        </footer>

        <CommandPalette />
        <AIChat />
      </div>
    </div>
  )
}

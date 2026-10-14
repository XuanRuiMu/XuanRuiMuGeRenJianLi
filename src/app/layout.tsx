import { type ReactNode } from 'react'
import { KeDiaoDaoHang } from '../components/resizable-nav/KeDiaoDaoHang'
import { MingLingMianBan } from '../components/command-palette/MingLingMianBan'
import { AILiaoTian } from '../components/ai-chat/AI聊天'
import { PWAZhuangTaiZhiShiQi } from '../components/PWA状态指示器'
import { XingKongXiXiBeiJing, ShuiMoXianXianZheZhao } from '../components/starry-background'
import { FangKeJiShu } from '../components/visitor-counter/FangKeJiShu'
import { t } from '../i18n/翻译'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-bg text-text-primary">
      <XingKongXiXiBeiJing className="z-0" />
      <ShuiMoXianXianZheZhao />
      <div className="relative z-10 flex min-h-screen flex-col">
        <PWAZhuangTaiZhiShiQi />
        <KeDiaoDaoHang />

        <main className="relative z-10 flex-1 pt-16">{children}</main>

        <footer className="border-t border-border px-4 py-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-xs text-muted text-shadow-readable sm:flex-row sm:items-center sm:justify-between">
            <span>{t('footer.copyright')}</span>
            <FangKeJiShu />
            <span>{t('footer.status')}</span>
          </div>
        </footer>

        <MingLingMianBan />
        <AILiaoTian />
      </div>
    </div>
  )
}

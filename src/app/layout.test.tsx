import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { Layout } from './layout'

vi.mock('../components/theme-toggle/ThemeToggle', () => ({
  ThemeToggle: () => <button type="button" data-testid="theme-toggle" />,
}))

vi.mock('../components/command-palette/CommandPalette', () => ({
  CommandPalette: () => <div data-testid="command-palette" />,
}))

vi.mock('../components/ai-chat/AIChat', () => ({
  AIChat: () => <div data-testid="ai-chat" />,
}))

vi.mock('../components/PWAStatusIndicator', () => ({
  PWAStatusIndicator: () => <div data-testid="pwa-status" />,
}))

vi.mock('../components/starry-background', () => ({
  StarryGalaxyBackground: ({ className, children }: { className?: string; children?: ReactNode }) => (
    <div data-testid="starry-background" className={className}>
      {children}
    </div>
  ),
  InkRevealOverlay: () => <div data-testid="ink-reveal-overlay" />,
}))

describe('Layout', () => {
  it('renders children and global starfield background', () => {
    render(
      <Layout>
        <section data-testid="page-content">content</section>
      </Layout>
    )

    expect(screen.getByTestId('page-content')).toBeInTheDocument()
    expect(screen.getByTestId('starry-background')).toBeInTheDocument()
    expect(screen.getByTestId('ink-reveal-overlay')).toBeInTheDocument()
  })

  it('renders navigation, theme toggle and overlays', () => {
    render(
      <Layout>
        <div>page</div>
      </Layout>
    )

    // 注：NavDock 组件已在先前工作中删除，导航现由 ResizableNav 渲染（其契约见
    // ResizableNav.test.tsx，断言 nav-dock 不应存在）。此处仅校验全局覆盖层挂载。
    expect(document.getElementById('starry-gui-root')).toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('command-palette')).toBeInTheDocument()
    expect(screen.getByTestId('ai-chat')).toBeInTheDocument()
    expect(screen.getByTestId('pwa-status')).toBeInTheDocument()
  })
})

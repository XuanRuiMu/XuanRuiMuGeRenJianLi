import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { BuJu } from './BuJu'

vi.mock('../组件/主题切换/ZhuTiQieHuan', () => ({
  ZhuTiQieHuan: () => <button type="button" data-testid="theme-toggle" />,
}))

vi.mock('../组件/命令面板/MingLingMianBan', () => ({
  MingLingMianBan: () => <div data-testid="command-palette" />,
}))

vi.mock('../组件/AI聊天/AI聊天', () => ({
  AILiaoTian: () => <div data-testid="ai-chat" />,
}))

vi.mock('../组件/PWA状态指示器', () => ({
  PWAZhuangTaiZhiShiQi: () => <div data-testid="pwa-status" />,
}))

vi.mock('../组件/星空背景', () => ({
  XingKongXiXiBeiJing: ({ className, children }: { className?: string; children?: ReactNode }) => (
    <div data-testid="starry-background" className={className}>
      {children}
    </div>
  ),
  ShuiMoXianXianZheZhao: () => <div data-testid="ink-reveal-overlay" />,
}))

vi.mock('../库/分析接口', () => ({
  访问统计开关: false,
  useFangWenTongJi: () => ({ data: null, isLoading: false }),
  useShangBaoFangWen: () => ({ mutate: vi.fn() }),
}))

describe('Layout', () => {
  it('renders children and global starfield background', () => {
    render(
      <BuJu>
        <section data-testid="page-content">content</section>
      </BuJu>
    )

    expect(screen.getByTestId('page-content')).toBeInTheDocument()
    expect(screen.getByTestId('starry-background')).toBeInTheDocument()
    expect(screen.getByTestId('ink-reveal-overlay')).toBeInTheDocument()
  })

  it('renders navigation, theme toggle and overlays', () => {
    render(
      <BuJu>
        <div>page</div>
      </BuJu>
    )

    // 注：NavDock 组件已在先前工作中删除，导航现由 KeDiaoDaoHang 渲染（其契约见
    // KeDiaoDaoHang.test.tsx，断言 nav-dock 不应存在）。此处仅校验全局覆盖层挂载。
    expect(document.getElementById('starry-gui-root')).toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('command-palette')).toBeInTheDocument()
    expect(screen.getByTestId('ai-chat')).toBeInTheDocument()
    expect(screen.getByTestId('pwa-status')).toBeInTheDocument()
  })

  it('页脚始终挂载访客人数徽章', () => {
    render(
      <BuJu>
        <div>page</div>
      </BuJu>
    )
    expect(screen.getByTestId('visitor-counter-card')).toBeInTheDocument()
  })
})

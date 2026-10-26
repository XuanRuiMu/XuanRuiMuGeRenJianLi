import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { KeDiaoDaoHang } from './KeDiaoDaoHang'
import { t } from '../../国际化/翻译'

const 切换区块 = vi.fn()
const 设置命令面板打开 = vi.fn()

vi.mock('../../状态/应用状态仓库', () => ({
  useYingYongZhuangTai: (选择器: (状态: unknown) => unknown) => 选择器({ 切换到区块: 切换区块, 设置命令面板打开 }),
}))

vi.mock('../主题切换/ZhuTiQieHuan', () => ({
  ZhuTiQieHuan: () => <div data-testid="theme-toggle" />,
}))

const 导航区块表 = ['about', 'projects', 'experience', 'education', 'contact'] as const

describe('ResizableNav（12-next-spline-3d 顶部菜单栏移植）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 0 })
  })

  it('renders the glass navbar with nav pills including contact, and no command palette button', () => {
    render(<KeDiaoDaoHang />)

    const 桌面导航条 = document.querySelector('.glass-nav')
    expect(桌面导航条).not.toBeNull()
    expect(桌面导航条).toHaveClass('rounded-full')

    for (const 区块 of 导航区块表) {
      expect(screen.getAllByText(t(`nav.${区块}` as never)).length).toBeGreaterThan(0)
    }
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    expect(screen.queryByTestId('nav-dock')).not.toBeInTheDocument()
    expect(screen.queryByText(t('command.open'))).not.toBeInTheDocument()
  })

  it('places the effects panel trigger next to the logo on the left', () => {
    render(<KeDiaoDaoHang />)

    const 控制面板根元素 = document.getElementById('starry-gui-root')
    expect(控制面板根元素).not.toBeNull()
    const 标志 = screen.getByRole('button', { name: t('nav.hero') })

    expect(控制面板根元素!.previousElementSibling).toBe(标志)
  })

  it('navigates to the target section when a pill is clicked', () => {
    render(<KeDiaoDaoHang />)

    fireEvent.click(screen.getAllByText(t('nav.projects') as never)[0])
    expect(切换区块).toHaveBeenCalledWith('projects')

    fireEvent.click(screen.getAllByText(t('nav.contact') as never)[0])
    expect(切换区块).toHaveBeenCalledWith('contact')
  })

  it('expands fully at the top and shrinks with shadow after scrolling past 100px', async () => {
    Object.defineProperty(document, 'scrollingElement', {
      configurable: true,
      get: () => document.body,
    })

    render(<KeDiaoDaoHang />)

    const 桌面导航条 = document.querySelector('.glass-nav') as HTMLElement
    expect(桌面导航条).not.toHaveClass('shadow-lg')

    document.body.scrollTop = 300
    fireEvent.scroll(window)

    await waitFor(
      () => {
        expect(桌面导航条).toHaveClass('shadow-lg')
      },
      { timeout: 3000 }
    )
  })

  it('opens and closes the mobile menu via the hamburger toggle', () => {
    render(<KeDiaoDaoHang />)

    const toggle = screen.getByRole('button', { name: t('nav.main') })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByText(t('nav.about') as never).length).toBeGreaterThan(1)

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })
})

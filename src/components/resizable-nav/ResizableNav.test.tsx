import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ResizableNav } from './ResizableNav'
import { t } from '../../i18n/translations'

const transitionToSection = vi.fn()
const setCommandOpen = vi.fn()

vi.mock('../../store/useAppStore', () => ({
  useAppStore: (selector: (state: unknown) => unknown) =>
    selector({ transitionToSection, setCommandOpen }),
}))

vi.mock('../theme-toggle/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}))

const NAV_SECTIONS = ['about', 'projects', 'experience', 'education', 'contact'] as const

describe('ResizableNav（12-next-spline-3d 顶部菜单栏移植）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 0 })
  })

  it('renders the glass navbar with nav pills including contact, and no command palette button', () => {
    render(<ResizableNav />)

    const desktopBar = document.querySelector('.glass-nav')
    expect(desktopBar).not.toBeNull()
    expect(desktopBar).toHaveClass('rounded-full')

    for (const section of NAV_SECTIONS) {
      expect(screen.getAllByText(t(`nav.${section}` as never)).length).toBeGreaterThan(0)
    }
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    expect(screen.queryByTestId('nav-dock')).not.toBeInTheDocument()
    expect(screen.queryByText(t('command.open'))).not.toBeInTheDocument()
  })

  it('places the effects panel trigger next to the logo on the left', () => {
    render(<ResizableNav />)

    const guiRoot = document.getElementById('starry-gui-root')
    expect(guiRoot).not.toBeNull()
    const logo = screen.getByRole('button', { name: t('nav.hero') })
    // 特效面板容器紧跟在 logo 按钮之后，同处左簇
    expect(guiRoot!.previousElementSibling).toBe(logo)
  })

  it('navigates to the target section when a pill is clicked', () => {
    render(<ResizableNav />)

    fireEvent.click(screen.getAllByText(t('nav.projects') as never)[0])
    expect(transitionToSection).toHaveBeenCalledWith('projects')

    fireEvent.click(screen.getAllByText(t('nav.contact') as never)[0])
    expect(transitionToSection).toHaveBeenCalledWith('contact')
  })

  it('expands fully at the top and shrinks with shadow after scrolling past 100px', async () => {
    // jsdom 未实现 document.scrollingElement，framer-motion 的 useScroll 依赖它挂载监听
    Object.defineProperty(document, 'scrollingElement', {
      configurable: true,
      get: () => document.body,
    })

    render(<ResizableNav />)

    const desktopBar = document.querySelector('.glass-nav') as HTMLElement
    expect(desktopBar).not.toHaveClass('shadow-lg')

    document.body.scrollTop = 300
    fireEvent.scroll(window)

    await waitFor(
      () => {
        expect(desktopBar).toHaveClass('shadow-lg')
      },
      { timeout: 3000 }
    )
  })

  it('opens and closes the mobile menu via the hamburger toggle', () => {
    render(<ResizableNav />)

    const toggle = screen.getByRole('button', { name: t('nav.main') })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByText(t('nav.about') as never).length).toBeGreaterThan(1)

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })
})

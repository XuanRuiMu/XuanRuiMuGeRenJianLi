import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
const { hookState, createMock, 变形器假体 } = vi.hoisted(() => {
  const hookState = { reducedMotion: false, isDark: true }
  const createMock = vi.fn()
  const 变形器假体 = {
    切换: vi.fn(),
    设颜色: vi.fn(),
    设静态: vi.fn(),
    销毁: vi.fn(),
  }
  createMock.mockReturnValue(变形器假体)
  return { hookState, createMock, 变形器假体 }
})

vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => hookState.reducedMotion,
}))

vi.mock('../../components/starry-background/useIsDarkMode', () => ({
  useIsDarkMode: () => hookState.isDark,
}))

vi.mock('./asciiMorph', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  创建点阵变形器: createMock,
}))

import { TechStack } from './TechStack'

describe('TechStack 技术栈点阵变形', () => {
  beforeEach(() => {
    hookState.reducedMotion = false
    hookState.isDark = true
    createMock.mockClear()
    createMock.mockReturnValue(变形器假体)
    变形器假体.切换.mockClear()
    变形器假体.设颜色.mockClear()
    变形器假体.设静态.mockClear()
    变形器假体.销毁.mockClear()
  })

  it('渲染标题与画布，无可见标签行，并以 15 个技术图标创建变形器', () => {
    render(<TechStack />)
    expect(screen.getByText('本页及相关项目所使用技术栈')).toBeInTheDocument()
    expect(screen.getByTestId('tech-ascii-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('tech-morph-button')).toHaveAttribute('aria-label', '切换技术栈图标，当前')
    // 标签行与切换提示已按需求移除，画布下只保留技术名跳转链接
    expect(screen.queryByTestId('tech-morph-label')).not.toBeInTheDocument()
    expect(screen.queryByText('点击切换')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tech-current-link')).not.toBeInTheDocument()

    expect(createMock).toHaveBeenCalledTimes(1)
    const [画布, 定义, 选项] = createMock.mock.calls[0]
    expect(画布).toBe(screen.getByTestId('tech-ascii-canvas'))
    expect(定义).toHaveLength(15)
    expect(定义[0]).toMatchObject({ id: 'Java', name: 'Java', glyph: 'J', src: '/logos/java.svg' })
    expect(选项.颜色).toBe('#cfe6ff')
    expect(选项.静态).toBe(false)
  })

  it('变形器回调驱动官网链接更新，链接文案含技术名与项目归属', () => {
    render(<TechStack />)
    const [, , 选项] = createMock.mock.calls[0]
    act(() => {
      选项.on序号变更(4, 'MySQL', 15)
    })
    const 链接 = screen.getByTestId('tech-current-link')
    expect(链接).toHaveAttribute('href', 'https://www.mysql.com')
    expect(链接).toHaveTextContent('MySQL ↗ · 暮澜纪元')
    expect(链接).toHaveAttribute('aria-label', 'MySQL 官网链接，使用项目 暮澜纪元')
    expect(screen.getByTestId('tech-morph-button')).toHaveAttribute('aria-label', '切换技术栈图标，当前 MySQL')
  })

  it('多项目归属同排追加、以顿号分隔且整体仍为一行链接', () => {
    render(<TechStack />)
    const [, , 选项] = createMock.mock.calls[0]
    act(() => {
      选项.on序号变更(14, 'Vite', 15)
    })
    const 链接 = screen.getByTestId('tech-current-link')
    expect(链接).toHaveTextContent('Vite ↗ · 本站、羊来、和我恋爱吧、恋爱吧管理中心')
    expect(链接).toHaveAttribute('aria-label', 'Vite 官网链接，使用项目 本站、羊来、和我恋爱吧、恋爱吧管理中心')
    // 项目名单独成 span 并切回非等宽字体：中文在 font-mono 下会落到等宽回退字体，与拉丁字符混排不协调
    const 项目段 = 链接.querySelector('span')
    expect(项目段).not.toBeNull()
    expect(项目段?.textContent).toBe('· 本站、羊来、和我恋爱吧、恋爱吧管理中心')
    expect(项目段?.className).toContain('font-sans')
    expect(项目段?.className).toContain('opacity-60')
    expect(项目段?.className).toContain('light:opacity-100')
  })

  it('浅色主题运行时切换字符颜色', () => {
    const { rerender } = render(<TechStack />)
    expect(createMock.mock.calls[0][2].颜色).toBe('#cfe6ff')
    hookState.isDark = false
    rerender(<TechStack />)
    expect(变形器假体.设颜色).toHaveBeenCalledWith('#1e293b')
  })

  it('reduced-motion 运行时切换通知变形器进入静态', () => {
    const { rerender } = render(<TechStack />)
    hookState.reducedMotion = true
    rerender(<TechStack />)
    expect(变形器假体.设静态).toHaveBeenCalledWith(true)
  })

  it('加载失败时展示提示并将按钮标记 aria-disabled', () => {
    render(<TechStack />)
    const [, , 选项] = createMock.mock.calls[0]
    act(() => {
      选项.on加载失败()
    })
    expect(screen.getByTestId('tech-load-fail')).toHaveTextContent('技术图标暂时没有加载出来')
    expect(screen.getByTestId('tech-morph-button')).toHaveAttribute('aria-disabled', 'true')
  })

  it('卸载时销毁变形器', () => {
    const { unmount } = render(<TechStack />)
    unmount()
    expect(变形器假体.销毁).toHaveBeenCalledTimes(1)
  })
})

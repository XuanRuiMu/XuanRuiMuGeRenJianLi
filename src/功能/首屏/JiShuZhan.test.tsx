import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
const {
  hookState: 钩子状态,
  createMock: 创建测试替身,
  变形器假体,
} = vi.hoisted(() => {
  const 钩子状态 = { reducedMotion: false, isDark: true }
  const 创建测试替身 = vi.fn()
  const 变形器假体 = {
    切换: vi.fn(),
    设颜色: vi.fn(),
    设静态: vi.fn(),
    销毁: vi.fn(),
  }
  创建测试替身.mockReturnValue(变形器假体)
  return { hookState: 钩子状态, createMock: 创建测试替身, 变形器假体 }
})

vi.mock('../../钩子/useJianShaoDongHua', () => ({
  useJianShaoDongHua: () => 钩子状态.reducedMotion,
}))

vi.mock('../../组件/星空背景/useShiFouAnSe', () => ({
  useShiFouAnSe: () => 钩子状态.isDark,
}))

vi.mock('./DianZhenBianXing', async (导入原文) => ({
  ...(await 导入原文<Record<string, unknown>>()),
  创建点阵变形器: 创建测试替身,
}))

import { JiShuZhan } from './JiShuZhan'

describe('TechStack 技术栈点阵变形', () => {
  beforeEach(() => {
    钩子状态.reducedMotion = false
    钩子状态.isDark = true
    创建测试替身.mockClear()
    创建测试替身.mockReturnValue(变形器假体)
    变形器假体.切换.mockClear()
    变形器假体.设颜色.mockClear()
    变形器假体.设静态.mockClear()
    变形器假体.销毁.mockClear()
  })

  it('渲染标题与画布，无可见标签行，并以 15 个技术图标创建变形器', () => {
    render(<JiShuZhan />)
    expect(screen.getByText('本页及相关项目所使用技术栈')).toBeInTheDocument()
    expect(screen.getByTestId('tech-ascii-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('tech-morph-button')).toHaveAttribute('aria-label', '切换技术栈图标，当前')

    expect(screen.queryByTestId('tech-morph-label')).not.toBeInTheDocument()
    expect(screen.queryByText('点击切换')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tech-current-link')).not.toBeInTheDocument()

    expect(创建测试替身).toHaveBeenCalledTimes(1)
    const [画布, 定义, 选项] = 创建测试替身.mock.calls[0]
    expect(画布).toBe(screen.getByTestId('tech-ascii-canvas'))
    expect(定义).toHaveLength(15)
    expect(定义[0]).toMatchObject({ id: 'Java', name: 'Java', 字形: 'J', src: '/logos/java.svg' })
    expect(选项.颜色).toBe('#cfe6ff')
    expect(选项.静态).toBe(false)
  })

  it('变形器回调驱动官网链接更新，链接文案含技术名与项目归属', () => {
    render(<JiShuZhan />)
    const [, , 选项] = 创建测试替身.mock.calls[0]
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
    render(<JiShuZhan />)
    const [, , 选项] = 创建测试替身.mock.calls[0]
    act(() => {
      选项.on序号变更(14, 'Vite', 15)
    })
    const 链接 = screen.getByTestId('tech-current-link')
    expect(链接).toHaveTextContent('Vite ↗ · 本站、羊来、和我恋爱吧、恋爱吧管理中心')
    expect(链接).toHaveAttribute('aria-label', 'Vite 官网链接，使用项目 本站、羊来、和我恋爱吧、恋爱吧管理中心')

    const 项目段 = 链接.querySelector('span')
    expect(项目段).not.toBeNull()
    expect(项目段?.textContent).toBe('· 本站、羊来、和我恋爱吧、恋爱吧管理中心')
    expect(项目段?.className).toContain('font-sans')
    expect(项目段?.className).toContain('opacity-60')
    expect(项目段?.className).toContain('light:opacity-100')
  })

  it('浅色主题运行时切换字符颜色', () => {
    const { rerender: 重渲染 } = render(<JiShuZhan />)
    expect(创建测试替身.mock.calls[0][2].颜色).toBe('#cfe6ff')
    钩子状态.isDark = false
    重渲染(<JiShuZhan />)
    expect(变形器假体.设颜色).toHaveBeenCalledWith('#1e293b')
  })

  it('reduced-motion 运行时切换通知变形器进入静态', () => {
    const { rerender: 重渲染 } = render(<JiShuZhan />)
    钩子状态.reducedMotion = true
    重渲染(<JiShuZhan />)
    expect(变形器假体.设静态).toHaveBeenCalledWith(true)
  })

  it('加载失败时展示提示并将按钮标记 aria-disabled', () => {
    render(<JiShuZhan />)
    const [, , 选项] = 创建测试替身.mock.calls[0]
    act(() => {
      选项.on加载失败()
    })
    expect(screen.getByTestId('tech-load-fail')).toHaveTextContent('技术图标暂时没有加载出来')
    expect(screen.getByTestId('tech-morph-button')).toHaveAttribute('aria-disabled', 'true')
  })

  it('卸载时销毁变形器', () => {
    const { unmount: 卸载 } = render(<JiShuZhan />)
    卸载()
    expect(变形器假体.销毁).toHaveBeenCalledTimes(1)
  })
})

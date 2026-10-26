import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { JieMianZuJianXuanRanQi } from './界面组件注册表'
import { t } from '../../国际化/翻译'
import { 个人信息 } from '../../数据/个人信息'

describe('UiComponentRenderer', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders ProjectCard component', () => {
    render(<JieMianZuJianXuanRanQi 组件={{ type: 'ProjectCard', 项目编号: 'xrm' }} />)
    expect(screen.getByTestId('ui-component-ProjectCard')).toBeInTheDocument()
    expect(screen.getByText('暮澜纪元')).toBeInTheDocument()
  })

  it('renders Timeline component with experience scope', () => {
    render(<JieMianZuJianXuanRanQi 组件={{ type: 'Timeline', scope: 'experience' }} />)
    expect(screen.getByTestId('ui-component-Timeline')).toBeInTheDocument()
    expect(screen.getByText(t('experience.title'))).toBeInTheDocument()
  })

  it('renders Timeline component with experience scope by default', () => {
    render(<JieMianZuJianXuanRanQi 组件={{ type: 'Timeline' }} />)
    expect(screen.getByTestId('ui-component-Timeline')).toBeInTheDocument()
    expect(screen.getByText(t('experience.title'))).toBeInTheDocument()
  })

  it('renders ContactLinks with five ways and no email leak', () => {
    render(<JieMianZuJianXuanRanQi 组件={{ type: 'ContactLinks' }} />)
    expect(screen.getByTestId('ui-component-ContactLinks')).toBeInTheDocument()
    expect(screen.getByText(t('ai.contactLinks.github'), { exact: false })).toBeInTheDocument()
    expect(screen.getByText(t('ai.contactLinks.bilibili'), { exact: false })).toBeInTheDocument()
    expect(screen.getByText(t('ai.contactLinks.qq'), { exact: false })).toBeInTheDocument()
    expect(screen.getByText(t('ai.contactLinks.wechat'), { exact: false })).toBeInTheDocument()
    expect(screen.getByText(t('ai.contactLinks.phone'), { exact: false })).toBeInTheDocument()
    expect(screen.queryByText(个人信息.邮箱)).not.toBeInTheDocument()
  })

  it('opens github and bilibili via blank links', () => {
    render(<JieMianZuJianXuanRanQi 组件={{ type: 'ContactLinks' }} />)
    const GitHub = screen.getByRole('link', { name: `${t('ai.contactLinks.github')}${t('ai.contactLinks.open')}` })
    const 哔哩哔哩 = screen.getByRole('link', { name: `${t('ai.contactLinks.bilibili')}${t('ai.contactLinks.open')}` })
    expect(GitHub).toHaveAttribute('href', 个人信息.GitHub)
    expect(GitHub).toHaveAttribute('target', '_blank')
    expect(哔哩哔哩).toHaveAttribute('href', 个人信息.哔哩哔哩)
    expect(哔哩哔哩).toHaveAttribute('target', '_blank')
  })

  it('copies qq and tries protocol wakeup', async () => {
    const 写入 = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: 写入 }, configurable: true })
    const 打开 = vi.fn()
    vi.stubGlobal('open', 打开)
    const 原始Open = window.open
    window.open = 打开 as typeof window.open
    try {
      render(<JieMianZuJianXuanRanQi 组件={{ type: 'ContactLinks' }} />)
      fireEvent.click(screen.getByRole('button', { name: `${t('ai.contactLinks.qq')}${t('ai.contactLinks.copy')}` }))
      await waitFor(() => {
        expect(写入).toHaveBeenCalledWith(个人信息.QQ)
      })
      expect(打开).toHaveBeenCalledWith(expect.stringContaining('tencent://'), '_blank', 'noopener')
      await waitFor(() => {
        expect(screen.getByText(t('ai.contactLinks.copied'), { exact: false })).toBeInTheDocument()
      })
    } finally {
      window.open = 原始Open
      vi.unstubAllGlobals()
    }
  })

  it('copies wechat and tries protocol wakeup', async () => {
    const 写入 = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: 写入 }, configurable: true })
    const 打开 = vi.fn()
    const 原始Open = window.open
    window.open = 打开 as typeof window.open
    try {
      render(<JieMianZuJianXuanRanQi 组件={{ type: 'ContactLinks' }} />)
      fireEvent.click(
        screen.getByRole('button', { name: `${t('ai.contactLinks.wechat')}${t('ai.contactLinks.copy')}` })
      )
      await waitFor(() => {
        expect(写入).toHaveBeenCalledWith(个人信息.wechat)
      })
      expect(打开).toHaveBeenCalledWith(expect.stringContaining('weixin://'), '_blank', 'noopener')
    } finally {
      window.open = 原始Open
    }
  })

  it('copies phone without protocol wakeup', async () => {
    const 写入 = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: 写入 }, configurable: true })
    const 打开 = vi.fn()
    const 原始Open = window.open
    window.open = 打开 as typeof window.open
    try {
      render(<JieMianZuJianXuanRanQi 组件={{ type: 'ContactLinks' }} />)
      fireEvent.click(screen.getByRole('button', { name: `${t('ai.contactLinks.phone')}${t('ai.contactLinks.copy')}` }))
      await waitFor(() => {
        expect(写入).toHaveBeenCalledWith(个人信息.电话)
      })
      expect(打开).not.toHaveBeenCalled()
      await waitFor(() => {
        expect(screen.getByText(t('ai.contactLinks.copied'), { exact: false })).toBeInTheDocument()
      })
    } finally {
      window.open = 原始Open
    }
  })
})

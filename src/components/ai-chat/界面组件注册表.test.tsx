import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { JieMianZuJianXuanRanQi } from './界面组件注册表'
import { t } from '../../i18n/翻译'
import { 个人信息 } from '../../data/个人信息'

describe('UiComponentRenderer', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders ProjectCard component', () => {
    render(<JieMianZuJianXuanRanQi component={{ type: 'ProjectCard', projectId: 'xrm' }} />)
    expect(screen.getByTestId('ui-component-ProjectCard')).toBeInTheDocument()
    expect(screen.getByText('暮澜纪元')).toBeInTheDocument()
  })

  it('renders Timeline component with experience scope', () => {
    render(<JieMianZuJianXuanRanQi component={{ type: 'Timeline', scope: 'experience' }} />)
    expect(screen.getByTestId('ui-component-Timeline')).toBeInTheDocument()
    expect(screen.getByText(t('experience.title'))).toBeInTheDocument()
  })

  it('renders Timeline component with experience scope by default', () => {
    render(<JieMianZuJianXuanRanQi component={{ type: 'Timeline' }} />)
    expect(screen.getByTestId('ui-component-Timeline')).toBeInTheDocument()
    expect(screen.getByText(t('experience.title'))).toBeInTheDocument()
  })

  it('renders ContactLinks with five ways and no email leak', () => {
    render(<JieMianZuJianXuanRanQi component={{ type: 'ContactLinks' }} />)
    expect(screen.getByTestId('ui-component-ContactLinks')).toBeInTheDocument()
    expect(screen.getByText(t('ai.contactLinks.github'), { exact: false })).toBeInTheDocument()
    expect(screen.getByText(t('ai.contactLinks.bilibili'), { exact: false })).toBeInTheDocument()
    expect(screen.getByText(t('ai.contactLinks.qq'), { exact: false })).toBeInTheDocument()
    expect(screen.getByText(t('ai.contactLinks.wechat'), { exact: false })).toBeInTheDocument()
    expect(screen.getByText(t('ai.contactLinks.phone'), { exact: false })).toBeInTheDocument()
    expect(screen.queryByText(个人信息.email)).not.toBeInTheDocument()
  })

  it('opens github and bilibili via blank links', () => {
    render(<JieMianZuJianXuanRanQi component={{ type: 'ContactLinks' }} />)
    const github = screen.getByRole('link', { name: `${t('ai.contactLinks.github')}${t('ai.contactLinks.open')}` })
    const bilibili = screen.getByRole('link', { name: `${t('ai.contactLinks.bilibili')}${t('ai.contactLinks.open')}` })
    expect(github).toHaveAttribute('href', 个人信息.github)
    expect(github).toHaveAttribute('target', '_blank')
    expect(bilibili).toHaveAttribute('href', 个人信息.bilibili)
    expect(bilibili).toHaveAttribute('target', '_blank')
  })

  it('copies qq and tries protocol wakeup', async () => {
    const 写入 = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: 写入 }, configurable: true })
    const 打开 = vi.fn()
    vi.stubGlobal('open', 打开)
    const 原始Open = window.open
    window.open = 打开 as typeof window.open
    try {
      render(<JieMianZuJianXuanRanQi component={{ type: 'ContactLinks' }} />)
      fireEvent.click(screen.getByRole('button', { name: `${t('ai.contactLinks.qq')}${t('ai.contactLinks.copy')}` }))
      await waitFor(() => {
        expect(写入).toHaveBeenCalledWith(个人信息.qq)
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
      render(<JieMianZuJianXuanRanQi component={{ type: 'ContactLinks' }} />)
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
      render(<JieMianZuJianXuanRanQi component={{ type: 'ContactLinks' }} />)
      fireEvent.click(screen.getByRole('button', { name: `${t('ai.contactLinks.phone')}${t('ai.contactLinks.copy')}` }))
      await waitFor(() => {
        expect(写入).toHaveBeenCalledWith(个人信息.phone)
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

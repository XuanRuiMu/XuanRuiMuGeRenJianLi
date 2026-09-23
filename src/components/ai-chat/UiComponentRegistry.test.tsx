import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UiComponentRenderer } from './UiComponentRegistry'
import { t } from '../../i18n/translations'
import { personalInfo } from '../../data/personalInfo'

describe('UiComponentRenderer', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders ProjectCard component', () => {
    render(<UiComponentRenderer component={{ type: 'ProjectCard', projectId: 'xrm' }} />)
    expect(screen.getByTestId('ui-component-ProjectCard')).toBeInTheDocument()
    expect(screen.getByText('暮澜纪元')).toBeInTheDocument()
  })

  it('renders Timeline component with experience scope', () => {
    render(<UiComponentRenderer component={{ type: 'Timeline', scope: 'experience' }} />)
    expect(screen.getByTestId('ui-component-Timeline')).toBeInTheDocument()
    expect(screen.getByText(t('experience.title'))).toBeInTheDocument()
  })

  it('renders Timeline component with experience scope by default', () => {
    render(<UiComponentRenderer component={{ type: 'Timeline' }} />)
    expect(screen.getByTestId('ui-component-Timeline')).toBeInTheDocument()
    expect(screen.getByText(t('experience.title'))).toBeInTheDocument()
  })

  it('renders ContactLinks with five ways and no email leak', () => {
    render(<UiComponentRenderer component={{ type: 'ContactLinks' }} />)
    expect(screen.getByTestId('ui-component-ContactLinks')).toBeInTheDocument()
    expect(screen.getByText(t('ai.contactLinks.github'), { exact: false })).toBeInTheDocument()
    expect(screen.getByText(t('ai.contactLinks.bilibili'), { exact: false })).toBeInTheDocument()
    expect(screen.getByText(t('ai.contactLinks.qq'), { exact: false })).toBeInTheDocument()
    expect(screen.getByText(t('ai.contactLinks.wechat'), { exact: false })).toBeInTheDocument()
    expect(screen.getByText(t('ai.contactLinks.phone'), { exact: false })).toBeInTheDocument()
    expect(screen.queryByText(personalInfo.email)).not.toBeInTheDocument()
  })

  it('opens github and bilibili via blank links', () => {
    render(<UiComponentRenderer component={{ type: 'ContactLinks' }} />)
    const github = screen.getByRole('link', { name: `${t('ai.contactLinks.github')}${t('ai.contactLinks.open')}` })
    const bilibili = screen.getByRole('link', { name: `${t('ai.contactLinks.bilibili')}${t('ai.contactLinks.open')}` })
    expect(github).toHaveAttribute('href', personalInfo.github)
    expect(github).toHaveAttribute('target', '_blank')
    expect(bilibili).toHaveAttribute('href', personalInfo.bilibili)
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
      render(<UiComponentRenderer component={{ type: 'ContactLinks' }} />)
      fireEvent.click(screen.getByRole('button', { name: `${t('ai.contactLinks.qq')}${t('ai.contactLinks.copy')}` }))
      await waitFor(() => {
        expect(写入).toHaveBeenCalledWith(personalInfo.qq)
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
      render(<UiComponentRenderer component={{ type: 'ContactLinks' }} />)
      fireEvent.click(
        screen.getByRole('button', { name: `${t('ai.contactLinks.wechat')}${t('ai.contactLinks.copy')}` })
      )
      await waitFor(() => {
        expect(写入).toHaveBeenCalledWith(personalInfo.wechat)
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
      render(<UiComponentRenderer component={{ type: 'ContactLinks' }} />)
      fireEvent.click(screen.getByRole('button', { name: `${t('ai.contactLinks.phone')}${t('ai.contactLinks.copy')}` }))
      await waitFor(() => {
        expect(写入).toHaveBeenCalledWith(personalInfo.phone)
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

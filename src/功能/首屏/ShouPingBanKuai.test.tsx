import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShouPingBanKuai } from './ShouPingBanKuai'
import { 个人信息 } from '../../数据/个人信息'
import { t } from '../../国际化/翻译'

vi.mock('./DianZhenBianXing', async (导入原文) => ({
  ...(await 导入原文<Record<string, unknown>>()),
  创建点阵变形器: vi.fn(() => null),
}))

describe('HeroSection', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('renders name, rotating role typewriter and tech stack', () => {
    render(<ShouPingBanKuai />)
    expect(screen.getByRole('heading', { name: 个人信息.name })).toBeInTheDocument()

    expect(screen.getByTestId('hero-signature')).toHaveAttribute('src', '/images/签字-alpha.webp')
    expect(screen.getByTestId('hero-signature').getAttribute('class') ?? '').toContain('dark:invert')
    expect(screen.getByTestId('role-typewriter')).toBeInTheDocument()

    expect(screen.getByTestId('tech-ascii-canvas')).toBeInTheDocument()
  })

  it('renders the download resume button (only CTA kept)', () => {
    render(<ShouPingBanKuai />)
    expect(screen.getByRole('button', { name: t('hero.cta.downloadResume') })).toBeInTheDocument()

    expect(screen.queryByText('复制邮箱')).not.toBeInTheDocument()
    expect(screen.queryByText('查看项目')).not.toBeInTheDocument()
    expect(screen.queryByText('AI 问答')).not.toBeInTheDocument()
  })

  it('downloads resume markdown file', () => {
    const 创建对象地址 = vi.fn(() => 'blob://resume')
    const 撤销对象地址 = vi.fn()
    const click = vi.fn()
    const appendChild = vi.spyOn(document.body, 'appendChild')
    const removeChild = vi.spyOn(document.body, 'removeChild')

    Object.assign(URL, { createObjectURL: 创建对象地址, revokeObjectURL: 撤销对象地址 })
    const 原始创建元素 = document.createElement
    document.createElement = vi.fn((标签名: string) => {
      const 元素 = 原始创建元素.call(document, 标签名)
      if (标签名 === 'a') {
        元素.click = click
      }
      return 元素
    }) as typeof document.createElement

    render(<ShouPingBanKuai />)
    fireEvent.click(screen.getByRole('button', { name: t('hero.cta.downloadResume') }))

    expect(创建对象地址).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(appendChild).toHaveBeenCalled()
    expect(removeChild).toHaveBeenCalled()
    expect(撤销对象地址).toHaveBeenCalledWith('blob://resume')

    document.createElement = 原始创建元素
  })

  it('renders the tech stack ASCII morph (canvas + name-only link, single icon at a time)', () => {
    render(<ShouPingBanKuai />)
    expect(screen.getByTestId('tech-ascii-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('tech-morph-button')).toBeInTheDocument()
    expect(screen.queryByTestId('tech-morph-label')).not.toBeInTheDocument()
    expect(screen.queryByText('点击切换')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tech-current-link')).not.toBeInTheDocument()
  })
})

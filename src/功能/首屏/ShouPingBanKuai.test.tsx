import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShouPingBanKuai } from './ShouPingBanKuai'
import { 个人信息 } from '../../数据/个人信息'
import { t } from '../../国际化/翻译'

// jsdom 无 2D 画布实现，mock 掉变形器创建以保持测试输出零噪音
vi.mock('./DianZhenBianXing', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
    // 主页标题已替换为签字图（透明底黑字，浅色深色/深色浅色），alt 承载姓名
    expect(screen.getByTestId('hero-signature')).toHaveAttribute('src', '/images/签字-alpha.png')
    expect(screen.getByTestId('hero-signature').getAttribute('class') ?? '').toContain('dark:invert')
    expect(screen.getByTestId('role-typewriter')).toBeInTheDocument()
    // 技术栈区已替换为 ASCII 点阵变形动画（单图标逐一呈现，不再同屏展示多个技术名）
    expect(screen.getByTestId('tech-ascii-canvas')).toBeInTheDocument()
  })

  it('renders the download resume button (only CTA kept)', () => {
    render(<ShouPingBanKuai />)
    expect(screen.getByRole('button', { name: t('hero.cta.downloadResume') })).toBeInTheDocument()
    // 复制邮箱 / 查看项目 / AI 问答 三个入口已按需求删除
    expect(screen.queryByText('复制邮箱')).not.toBeInTheDocument()
    expect(screen.queryByText('查看项目')).not.toBeInTheDocument()
    expect(screen.queryByText('AI 问答')).not.toBeInTheDocument()
  })

  it('downloads resume markdown file', () => {
    const createObjectURL = vi.fn(() => 'blob://resume')
    const revokeObjectURL = vi.fn()
    const click = vi.fn()
    const appendChild = vi.spyOn(document.body, 'appendChild')
    const removeChild = vi.spyOn(document.body, 'removeChild')

    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const originalCreateElement = document.createElement
    document.createElement = vi.fn((tagName: string) => {
      const element = originalCreateElement.call(document, tagName)
      if (tagName === 'a') {
        element.click = click
      }
      return element
    }) as typeof document.createElement

    render(<ShouPingBanKuai />)
    fireEvent.click(screen.getByRole('button', { name: t('hero.cta.downloadResume') }))

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(appendChild).toHaveBeenCalled()
    expect(removeChild).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob://resume')

    document.createElement = originalCreateElement
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

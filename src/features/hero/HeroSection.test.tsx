import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HeroSection } from './HeroSection'
import { personalInfo } from '../../data/personalInfo'
import { t } from '../../i18n/translations'

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
    render(<HeroSection />)
    expect(screen.getByRole('heading', { name: personalInfo.name })).toBeInTheDocument()
    expect(screen.getByTestId('role-typewriter')).toBeInTheDocument()
    expect(screen.getAllByText('Docker').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the download resume button (only CTA kept)', () => {
    render(<HeroSection />)
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

    render(<HeroSection />)
    fireEvent.click(screen.getByRole('button', { name: t('hero.cta.downloadResume') }))

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(appendChild).toHaveBeenCalled()
    expect(removeChild).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob://resume')

    document.createElement = originalCreateElement
  })

  it('renders the tech stack (TECH STACK marquee with docker/cloudinary)', () => {
    render(<HeroSection />)
    expect(screen.getAllByText('Docker').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Cloudinary').length).toBeGreaterThanOrEqual(1)
  })
})

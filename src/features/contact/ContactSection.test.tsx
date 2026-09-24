import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { ContactSection } from './ContactSection'
import { personalInfo } from '../../data/personalInfo'
import { t } from '../../i18n/translations'

describe('ContactSection', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText: vi.fn(() => Promise.resolve()) },
      configurable: true,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders section title and contact links', () => {
    render(<ContactSection />)
    expect(screen.getByRole('heading', { name: t('contact.title') })).toBeInTheDocument()
    expect(screen.getByText(personalInfo.email)).toBeInTheDocument()
    expect(screen.getAllByText('XuanRuiMu')).toHaveLength(2)
    expect(screen.getByText('玄锐暮')).toBeInTheDocument()
  })

  it('renders QQ and微信 cards with numbers', () => {
    render(<ContactSection />)
    const qqCard = screen.getByText(t('contact.info.qq')).closest('.contact-item-link') as HTMLElement
    within(qqCard).getByText(personalInfo.qq)
    const wechatCard = screen.getByText(t('contact.info.wechat')).closest('.contact-item-link') as HTMLElement
    within(wechatCard).getByText(personalInfo.wechat)
  })

  it('renders QR images with correct src and alt', () => {
    render(<ContactSection />)
    expect(screen.getByAltText(t('contact.qr.qqAlt'))).toHaveAttribute('src', '/images/qq-qr.png')
    expect(screen.getByAltText(t('contact.qr.wechatAlt'))).toHaveAttribute('src', '/images/wechat-qr.png')
  })

  it('二维码图片水平居中且不渲染扫码提示文案', () => {
    render(<ContactSection />)
    const qr = screen.getByAltText(t('contact.qr.qqAlt'))
    const wechat = screen.getByAltText(t('contact.qr.wechatAlt'))
    for (const img of [qr, wechat]) {
      expect(img.parentElement).toHaveClass('flex', 'justify-center')
    }
    expect(screen.queryByText('扫码加QQ就行')).not.toBeInTheDocument()
    expect(screen.queryByText('扫码加微信就行')).not.toBeInTheDocument()
  })

  it('keeps number text when QR image fails to load', () => {
    render(<ContactSection />)
    const qqImage = screen.getByAltText(t('contact.qr.qqAlt'))
    fireEvent.error(qqImage)
    expect(screen.queryByAltText(t('contact.qr.qqAlt'))).not.toBeInTheDocument()
    expect(screen.getByText(personalInfo.qq)).toBeInTheDocument()
    expect(screen.getByAltText(t('contact.qr.wechatAlt'))).toBeInTheDocument()
  })

  it('keeps微信 number text when微信 QR image fails to load', () => {
    render(<ContactSection />)
    fireEvent.error(screen.getByAltText(t('contact.qr.wechatAlt')))
    expect(screen.queryByAltText(t('contact.qr.wechatAlt'))).not.toBeInTheDocument()
    const wechatCard = screen.getByText(t('contact.info.wechat')).closest('.contact-item-link') as HTMLElement
    within(wechatCard).getByText(personalInfo.wechat)
    expect(screen.getByAltText(t('contact.qr.qqAlt'))).toBeInTheDocument()
  })

  it('renders no留言 form fields', () => {
    const { container } = render(<ContactSection />)
    expect(container.querySelector('form')).not.toBeInTheDocument()
    expect(container.querySelector('textarea')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('contact links have correct href attributes', () => {
    render(<ContactSection />)
    expect(screen.getByRole('link', { name: new RegExp(personalInfo.email) })).toHaveAttribute(
      'href',
      `mailto:${personalInfo.email}`
    )
    expect(screen.getByRole('link', { name: /XuanRuiMu/i })).toHaveAttribute('href', personalInfo.github)
    expect(screen.getByRole('link', { name: /玄锐暮/i })).toHaveAttribute('href', personalInfo.bilibili)
  })

  it('renders contact cards with the ported Get In Touch design', () => {
    render(<ContactSection />)
    const cards = document.querySelectorAll('.contact-item-link')
    expect(cards).toHaveLength(5)
    for (const card of cards) {
      expect(card.querySelector('.contact-item-icon')).not.toBeNull()
      expect(card.querySelector('.contact-item-value')).not.toBeNull()
    }
  })

  it('renders the copy-email button next to the email link', () => {
    render(<ContactSection />)
    const emailLink = screen.getByRole('link', { name: new RegExp(personalInfo.email) })
    const item = emailLink.closest('.contact-item-link') as HTMLElement
    expect(item.querySelector(`button[aria-label="复制${t('contact.info.email')}"]`)).not.toBeNull()
  })

  it('copies QQ number to clipboard and shows feedback', async () => {
    render(<ContactSection />)
    fireEvent.click(screen.getByRole('button', { name: `复制${t('contact.info.qq')}` }))
    await waitFor(() => {
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(personalInfo.qq)
    })
    expect(screen.getByText(t('hero.copied'))).toBeInTheDocument()
  })

  it('copies微信 id to clipboard and shows feedback', async () => {
    render(<ContactSection />)
    fireEvent.click(screen.getByRole('button', { name: `复制${t('contact.info.wechat')}` }))
    await waitFor(() => {
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(personalInfo.wechat)
    })
    expect(screen.getByText(t('hero.copied'))).toBeInTheDocument()
  })

  it('renders the Gomoku panel', () => {
    render(<ContactSection />)
    expect(screen.getByText(t('contact.stillSure.title'))).toBeInTheDocument()
  })

  it('外层网格为两列等宽2×2布局（lg:grid-cols-2，无旧不等宽类）', () => {
    render(<ContactSection />)
    const qqCard = screen.getByText(t('contact.info.qq')).closest('.contact-item-link') as HTMLElement
    const outerGrid = qqCard.parentElement as HTMLElement
    expect(outerGrid).toHaveClass('grid', 'lg:grid-cols-2')
    expect(outerGrid.className).not.toContain('lg:grid-cols-[1fr_1.2fr]')
    expect(outerGrid.children).toHaveLength(4)
  })

  it('桌面grid placement：上排=三链接卡|五子棋，下排=QQ|微信', () => {
    render(<ContactSection />)
    const emailCard = screen.getByText(t('contact.info.email')).closest('.contact-item-link') as HTMLElement
    const qqCard = screen.getByText(t('contact.info.qq')).closest('.contact-item-link') as HTMLElement
    const wechatCard = screen.getByText(t('contact.info.wechat')).closest('.contact-item-link') as HTMLElement
    const linksContainer = emailCard.parentElement as HTMLElement
    const outerGrid = qqCard.parentElement as HTMLElement

    expect(linksContainer).toHaveClass('lg:col-start-1', 'lg:row-start-1')
    expect(linksContainer).toHaveClass('flex', 'flex-col')
    expect(linksContainer.querySelectorAll('.contact-item-link')).toHaveLength(3)
    expect(linksContainer.contains(qqCard)).toBe(false)
    expect(linksContainer.contains(wechatCard)).toBe(false)

    expect(qqCard).toHaveClass('lg:col-start-1', 'lg:row-start-2')
    expect(wechatCard).toHaveClass('lg:col-start-2', 'lg:row-start-2')

    const children = Array.from(outerGrid.children)
    expect(children[0]).toBe(linksContainer)
    expect(children[1]).toBe(qqCard)
    expect(children[2]).toBe(wechatCard)
    const gomokuPanel = children[3] as HTMLElement
    expect(gomokuPanel.contains(screen.getByText(t('contact.stillSure.title')))).toBe(true)
    expect(gomokuPanel).toHaveClass('lg:col-start-2', 'lg:row-start-1')
  })

  it('DOM顺序保持 邮箱→GitHub→B站→QQ→微信→五子棋（移动端堆叠序）', () => {
    render(<ContactSection />)
    const cards = Array.from(document.querySelectorAll('.contact-item-link'))
    expect(cards.map((c) => c.querySelector('.contact-item-label')?.textContent)).toEqual([
      t('contact.info.email'),
      t('contact.info.github'),
      t('contact.info.bilibili'),
      t('contact.info.qq'),
      t('contact.info.wechat'),
    ])
    const wechatCard = cards[4]
    const gomokuTitle = screen.getByText(t('contact.stillSure.title'))
    expect(wechatCard.compareDocumentPosition(gomokuTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('三链接卡在lg下flex-1撑满行高（总高=行高=五子棋面板高）', () => {
    render(<ContactSection />)
    const emailCard = screen.getByText(t('contact.info.email')).closest('.contact-item-link') as HTMLElement
    const linksContainer = emailCard.parentElement as HTMLElement
    for (const card of linksContainer.querySelectorAll('.contact-item-link')) {
      expect(card).toHaveClass('lg:flex-1')
    }
  })
})

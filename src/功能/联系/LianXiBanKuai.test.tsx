import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { LianXiBanKuai } from './LianXiBanKuai'
import { 个人信息 } from '../../数据/个人信息'
import { t } from '../../国际化/翻译'

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
    render(<LianXiBanKuai />)
    expect(screen.getByRole('heading', { name: t('contact.title') })).toBeInTheDocument()
    expect(screen.getByText(个人信息.邮箱)).toBeInTheDocument()
    expect(screen.getAllByText('XuanRuiMu')).toHaveLength(2)
    expect(screen.getByText('玄锐暮')).toBeInTheDocument()
  })

  it('renders QQ and微信 cards with numbers', () => {
    render(<LianXiBanKuai />)
    const QQ卡片 = screen.getByText(t('contact.info.qq')).closest('.contact-item-link') as HTMLElement
    within(QQ卡片).getByText(个人信息.QQ)
    const 微信卡片 = screen.getByText(t('contact.info.wechat')).closest('.contact-item-link') as HTMLElement
    within(微信卡片).getByText(个人信息.wechat)
  })

  it('renders QR images with correct src and alt', () => {
    render(<LianXiBanKuai />)
    expect(screen.getByAltText(t('contact.qr.qqAlt'))).toHaveAttribute('src', '/images/qq-qr.webp')
    expect(screen.getByAltText(t('contact.qr.wechatAlt'))).toHaveAttribute('src', '/images/wechat-qr.webp')
  })

  it('二维码图片水平居中且不渲染扫码提示文案', () => {
    render(<LianXiBanKuai />)
    const 二维码 = screen.getByAltText(t('contact.qr.qqAlt'))
    const wechat = screen.getByAltText(t('contact.qr.wechatAlt'))
    for (const 图片元素 of [二维码, wechat]) {
      expect(图片元素.parentElement).toHaveClass('flex', 'justify-center')
    }
    expect(screen.queryByText('扫码加QQ就行')).not.toBeInTheDocument()
    expect(screen.queryByText('扫码加微信就行')).not.toBeInTheDocument()
  })

  it('keeps number text when QR image fails to load', () => {
    render(<LianXiBanKuai />)
    const QQ图片 = screen.getByAltText(t('contact.qr.qqAlt'))
    fireEvent.error(QQ图片)
    expect(screen.queryByAltText(t('contact.qr.qqAlt'))).not.toBeInTheDocument()
    expect(screen.getByText(个人信息.QQ)).toBeInTheDocument()
    expect(screen.getByAltText(t('contact.qr.wechatAlt'))).toBeInTheDocument()
  })

  it('keeps微信 number text when微信 QR image fails to load', () => {
    render(<LianXiBanKuai />)
    fireEvent.error(screen.getByAltText(t('contact.qr.wechatAlt')))
    expect(screen.queryByAltText(t('contact.qr.wechatAlt'))).not.toBeInTheDocument()
    const 微信卡片 = screen.getByText(t('contact.info.wechat')).closest('.contact-item-link') as HTMLElement
    within(微信卡片).getByText(个人信息.wechat)
    expect(screen.getByAltText(t('contact.qr.qqAlt'))).toBeInTheDocument()
  })

  it('renders no留言 form fields', () => {
    const { container: 容器 } = render(<LianXiBanKuai />)
    expect(容器.querySelector('form')).not.toBeInTheDocument()
    expect(容器.querySelector('textarea')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('contact links have correct href attributes', () => {
    render(<LianXiBanKuai />)
    expect(screen.getByRole('link', { name: new RegExp(个人信息.邮箱) })).toHaveAttribute(
      'href',
      `mailto:${个人信息.邮箱}`
    )
    expect(screen.getByRole('link', { name: /XuanRuiMu/i })).toHaveAttribute('href', 个人信息.GitHub)
    expect(screen.getByRole('link', { name: /玄锐暮/i })).toHaveAttribute('href', 个人信息.哔哩哔哩)
  })

  it('renders contact cards with the ported Get In Touch design', () => {
    render(<LianXiBanKuai />)
    const 卡片表 = document.querySelectorAll('.contact-item-link')
    expect(卡片表).toHaveLength(5)
    for (const 卡片 of 卡片表) {
      expect(卡片.querySelector('.contact-item-icon')).not.toBeNull()
      expect(卡片.querySelector('.contact-item-value')).not.toBeNull()
    }
  })

  it('renders the copy-email button next to the email link', () => {
    render(<LianXiBanKuai />)
    const 邮箱链接 = screen.getByRole('link', { name: new RegExp(个人信息.邮箱) })
    const 项 = 邮箱链接.closest('.contact-item-link') as HTMLElement
    expect(项.querySelector(`button[aria-label="复制${t('contact.info.email')}"]`)).not.toBeNull()
  })

  it('copies QQ number to clipboard and shows feedback', async () => {
    render(<LianXiBanKuai />)
    fireEvent.click(screen.getByRole('button', { name: `复制${t('contact.info.qq')}` }))
    await waitFor(() => {
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(个人信息.QQ)
    })
    expect(screen.getByText(t('hero.copied'))).toBeInTheDocument()
  })

  it('copies微信 id to clipboard and shows feedback', async () => {
    render(<LianXiBanKuai />)
    fireEvent.click(screen.getByRole('button', { name: `复制${t('contact.info.wechat')}` }))
    await waitFor(() => {
      expect(window.navigator.clipboard.writeText).toHaveBeenCalledWith(个人信息.wechat)
    })
    expect(screen.getByText(t('hero.copied'))).toBeInTheDocument()
  })

  it('renders the Gomoku panel', () => {
    render(<LianXiBanKuai />)
    expect(screen.getByText(t('contact.stillSure.title'))).toBeInTheDocument()
  })

  it('外层网格为两列等宽2×2布局（lg:grid-cols-2，无旧不等宽类）', () => {
    render(<LianXiBanKuai />)
    const QQ卡片 = screen.getByText(t('contact.info.qq')).closest('.contact-item-link') as HTMLElement
    const 外部网格 = QQ卡片.parentElement as HTMLElement
    expect(外部网格).toHaveClass('grid', 'lg:grid-cols-2')
    expect(外部网格.className).not.toContain('lg:grid-cols-[1fr_1.2fr]')
    expect(外部网格.children).toHaveLength(4)
  })

  it('桌面grid placement：上排=三链接卡|五子棋，下排=QQ|微信', () => {
    render(<LianXiBanKuai />)
    const 邮箱卡片 = screen.getByText(t('contact.info.email')).closest('.contact-item-link') as HTMLElement
    const QQ卡片 = screen.getByText(t('contact.info.qq')).closest('.contact-item-link') as HTMLElement
    const 微信卡片 = screen.getByText(t('contact.info.wechat')).closest('.contact-item-link') as HTMLElement
    const 链接容器 = 邮箱卡片.parentElement as HTMLElement
    const 外部网格 = QQ卡片.parentElement as HTMLElement

    expect(链接容器).toHaveClass('lg:col-start-1', 'lg:row-start-1')
    expect(链接容器).toHaveClass('flex', 'flex-col')
    expect(链接容器.querySelectorAll('.contact-item-link')).toHaveLength(3)
    expect(链接容器.contains(QQ卡片)).toBe(false)
    expect(链接容器.contains(微信卡片)).toBe(false)

    expect(QQ卡片).toHaveClass('lg:col-start-1', 'lg:row-start-2')
    expect(微信卡片).toHaveClass('lg:col-start-2', 'lg:row-start-2')

    const children = Array.from(外部网格.children)
    expect(children[0]).toBe(链接容器)
    expect(children[1]).toBe(QQ卡片)
    expect(children[2]).toBe(微信卡片)
    const 五子棋面板 = children[3] as HTMLElement
    expect(五子棋面板.contains(screen.getByText(t('contact.stillSure.title')))).toBe(true)
    expect(五子棋面板).toHaveClass('lg:col-start-2', 'lg:row-start-1')
  })

  it('DOM顺序保持 邮箱→GitHub→B站→QQ→微信→五子棋（移动端堆叠序）', () => {
    render(<LianXiBanKuai />)
    const 卡片表 = Array.from(document.querySelectorAll('.contact-item-link'))
    expect(卡片表.map((c) => c.querySelector('.contact-item-label')?.textContent)).toEqual([
      t('contact.info.email'),
      t('contact.info.github'),
      t('contact.info.bilibili'),
      t('contact.info.qq'),
      t('contact.info.wechat'),
    ])
    const 微信卡片 = 卡片表[4]
    const 五子棋标题 = screen.getByText(t('contact.stillSure.title'))
    expect(微信卡片.compareDocumentPosition(五子棋标题) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('三链接卡在lg下flex-1撑满行高（总高=行高=五子棋面板高）', () => {
    render(<LianXiBanKuai />)
    const 邮箱卡片 = screen.getByText(t('contact.info.email')).closest('.contact-item-link') as HTMLElement
    const 链接容器 = 邮箱卡片.parentElement as HTMLElement
    for (const 卡片 of 链接容器.querySelectorAll('.contact-item-link')) {
      expect(卡片).toHaveClass('lg:flex-1')
    }
  })
})

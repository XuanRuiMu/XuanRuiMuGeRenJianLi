import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ReactNode } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ContactSection } from './ContactSection'
import { personalInfo } from '../../data/personalInfo'
import { t } from '../../i18n/translations'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('ContactSection', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ success: true, mode: 'queued' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders section title and contact links', () => {
    render(<ContactSection />, { wrapper: createWrapper() })
    expect(screen.getByRole('heading', { name: t('contact.title') })).toBeInTheDocument()
    expect(screen.getByText(personalInfo.email)).toBeInTheDocument()
    expect(screen.getByText('XuanRuiMu')).toBeInTheDocument()
    expect(screen.getByText('玄锐暮')).toBeInTheDocument()
  })

  it('renders form fields', () => {
    render(<ContactSection />, { wrapper: createWrapper() })
    expect(screen.getByLabelText(t('contact.form.name'))).toBeInTheDocument()
    expect(screen.getByLabelText(t('contact.form.email'))).toBeInTheDocument()
    // 留言框扩容为原来的两倍（rows 4→8）
    expect(screen.getByLabelText(t('contact.form.message'))).toHaveAttribute('rows', '8')
    expect(screen.getByRole('button', { name: t('contact.form.submit') })).toBeInTheDocument()
  })

  it('shows validation errors for empty form', () => {
    render(<ContactSection />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByRole('button', { name: t('contact.form.submit') }))
    expect(screen.getByText(t('contact.validation.nameRequired'))).toBeInTheDocument()
    expect(screen.getByText(t('contact.validation.emailRequired'))).toBeInTheDocument()
    expect(screen.getByText(t('contact.validation.messageMin'))).toBeInTheDocument()
  })

  it('shows email validation error for invalid email', () => {
    render(<ContactSection />, { wrapper: createWrapper() })
    fireEvent.change(screen.getByLabelText(t('contact.form.email')), { target: { value: 'not-an-email' } })
    fireEvent.click(screen.getByRole('button', { name: t('contact.form.submit') }))
    expect(screen.getByText(t('contact.validation.emailInvalid'))).toBeInTheDocument()
  })

  it('shows message max length error', () => {
    render(<ContactSection />, { wrapper: createWrapper() })
    fireEvent.change(screen.getByLabelText(t('contact.form.message')), { target: { value: 'a'.repeat(501) } })
    fireEvent.click(screen.getByRole('button', { name: t('contact.form.submit') }))
    expect(screen.getByText(t('contact.validation.messageMax'))).toBeInTheDocument()
  })

  it('submits valid form and shows success message', async () => {
    render(<ContactSection />, { wrapper: createWrapper() })
    fireEvent.change(screen.getByLabelText(t('contact.form.name')), { target: { value: '测试用户' } })
    fireEvent.change(screen.getByLabelText(t('contact.form.email')), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText(t('contact.form.message')), {
      target: { value: '这是一段超过十个字符的留言内容。' },
    })
    fireEvent.click(screen.getByRole('button', { name: t('contact.form.submit') }))

    await waitFor(() => {
      expect(screen.getByText(t('contact.form.success'))).toBeInTheDocument()
    })

    expect(screen.getByLabelText(t('contact.form.name'))).toHaveValue('')
    expect(screen.getByLabelText(t('contact.form.email'))).toHaveValue('')
    expect(screen.getByLabelText(t('contact.form.message'))).toHaveValue('')
  })

  it('shows error message when submission fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ success: false, error: 'request_failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )
    )

    render(<ContactSection />, { wrapper: createWrapper() })
    fireEvent.change(screen.getByLabelText(t('contact.form.name')), { target: { value: '测试用户' } })
    fireEvent.change(screen.getByLabelText(t('contact.form.email')), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText(t('contact.form.message')), {
      target: { value: '这是一段超过十个字符的留言内容。' },
    })
    fireEvent.click(screen.getByRole('button', { name: t('contact.form.submit') }))

    await waitFor(() => {
      expect(screen.getByText(t('contact.form.error'))).toBeInTheDocument()
    })
  })

  it('clears validation error when user types', () => {
    render(<ContactSection />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByRole('button', { name: t('contact.form.submit') }))
    expect(screen.getByText(t('contact.validation.nameRequired'))).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(t('contact.form.name')), { target: { value: '玄锐暮' } })
    expect(screen.queryByText(t('contact.validation.nameRequired'))).not.toBeInTheDocument()
  })

  it('contact links have correct href attributes', () => {
    render(<ContactSection />, { wrapper: createWrapper() })
    expect(screen.getByRole('link', { name: new RegExp(personalInfo.email) })).toHaveAttribute(
      'href',
      `mailto:${personalInfo.email}`
    )
    expect(screen.getByRole('link', { name: /XuanRuiMu/i })).toHaveAttribute('href', personalInfo.github)
    expect(screen.getByRole('link', { name: /玄锐暮/i })).toHaveAttribute('href', personalInfo.bilibili)
  })

  it('renders contact cards with the ported Get In Touch design', () => {
    render(<ContactSection />, { wrapper: createWrapper() })
    const cards = document.querySelectorAll('.contact-item-link')
    expect(cards).toHaveLength(3)
    for (const card of cards) {
      expect(card.querySelector('.contact-item-icon')).not.toBeNull()
      expect(card.querySelector('.contact-item-value')).not.toBeNull()
    }
  })

  it('renders the copy-email button next to the email link', () => {
    render(<ContactSection />, { wrapper: createWrapper() })
    const emailLink = screen.getByRole('link', { name: new RegExp(personalInfo.email) })
    const item = emailLink.closest('.contact-item-link') as HTMLElement
    expect(item.querySelector('button[aria-label="复制"]')).not.toBeNull()
  })
})

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BanKuai } from './BanKuai'

describe('Section', () => {
  it('renders children', () => {
    render(<BanKuai>section content</BanKuai>)
    expect(screen.getByText('section content')).toBeInTheDocument()
  })

  it('renders title and subtitle', () => {
    render(
      <BanKuai title="about" subtitle="subtitle text">
        content
      </BanKuai>
    )
    expect(screen.getByRole('heading', { name: /about/i })).toBeInTheDocument()
    expect(screen.getByText('subtitle text')).toBeInTheDocument()
  })

  it('assigns an accessible label without rendering a visible heading', () => {
    const { container } = render(<BanKuai ariaLabel="testimonials">content</BanKuai>)
    expect(container.querySelector('section')).toHaveAttribute('aria-label', 'testimonials')
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('assigns id to section element', () => {
    const { container } = render(<BanKuai id="about">content</BanKuai>)
    expect(container.querySelector('section')).toHaveAttribute('id', 'about')
  })

  it('wraps the title block in a reveal element', () => {
    const { container } = render(<BanKuai title="about">content</BanKuai>)
    expect(container.querySelector('.reveal')).toBeTruthy()
  })

  it('merges custom className', () => {
    const { container } = render(<BanKuai className="custom-section">content</BanKuai>)
    expect(container.querySelector('section')).toHaveClass('custom-section')
  })
})

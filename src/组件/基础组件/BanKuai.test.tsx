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
      <BanKuai title="about" 副标题="subtitle text">
        content
      </BanKuai>
    )
    expect(screen.getByRole('heading', { name: /about/i })).toBeInTheDocument()
    expect(screen.getByText('subtitle text')).toBeInTheDocument()
  })

  it('assigns an accessible label without rendering a visible heading', () => {
    const { container: 容器 } = render(<BanKuai 无障碍标签="testimonials">content</BanKuai>)
    expect(容器.querySelector('section')).toHaveAttribute('aria-label', 'testimonials')
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('assigns id to section element', () => {
    const { container: 容器 } = render(<BanKuai id="about">content</BanKuai>)
    expect(容器.querySelector('section')).toHaveAttribute('id', 'about')
  })

  it('wraps the title block in a reveal element', () => {
    const { container: 容器 } = render(<BanKuai title="about">content</BanKuai>)
    expect(容器.querySelector('.reveal')).toBeTruthy()
  })

  it('merges custom className', () => {
    const { container: 容器 } = render(<BanKuai className="custom-section">content</BanKuai>)
    expect(容器.querySelector('section')).toHaveClass('custom-section')
  })
})

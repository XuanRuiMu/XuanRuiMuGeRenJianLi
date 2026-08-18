import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Section } from './Section'

describe('Section', () => {
  it('renders children', () => {
    render(<Section>section content</Section>)
    expect(screen.getByText('section content')).toBeInTheDocument()
  })

  it('renders title and subtitle', () => {
    render(
      <Section title="about" subtitle="subtitle text">
        content
      </Section>
    )
    expect(screen.getByRole('heading', { name: /about/i })).toBeInTheDocument()
    expect(screen.getByText('subtitle text')).toBeInTheDocument()
  })

  it('assigns id to section element', () => {
    const { container } = render(<Section id="about">content</Section>)
    expect(container.querySelector('section')).toHaveAttribute('id', 'about')
  })

  it('wraps the title block in a reveal element', () => {
    const { container } = render(<Section title="about">content</Section>)
    expect(container.querySelector('.reveal')).toBeTruthy()
  })

  it('merges custom className', () => {
    const { container } = render(<Section className="custom-section">content</Section>)
    expect(container.querySelector('section')).toHaveClass('custom-section')
  })
})

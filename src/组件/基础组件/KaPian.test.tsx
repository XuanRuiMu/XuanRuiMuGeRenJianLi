import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KaPian } from './KaPian'

describe('Card', () => {
  it('renders children', () => {
    render(<KaPian>card content</KaPian>)
    expect(screen.getByText('card content')).toBeInTheDocument()
  })

  it('renders header', () => {
    render(<KaPian header={<span data-testid="header">header</span>}>content</KaPian>)
    expect(screen.getByTestId('header')).toBeInTheDocument()
  })

  it('renders footer', () => {
    render(<KaPian footer={<span data-testid="footer">footer</span>}>content</KaPian>)
    expect(screen.getByTestId('footer')).toBeInTheDocument()
  })

  it('does not apply glass panel class by default', () => {
    const { container } = render(<KaPian>content</KaPian>)
    expect(container.firstChild).not.toHaveClass('glass-panel')
  })

  it('applies baseline static classes without glass leftovers', () => {
    const { container } = render(<KaPian>content</KaPian>)
    expect(container.firstChild).toHaveClass('card-container')
    expect(container.firstChild).not.toHaveClass('border')
    expect(container.firstChild).not.toHaveClass('border-border')
    expect(container.firstChild).not.toHaveClass('overflow-hidden')
  })

  it('applies hover lift class', () => {
    const { container } = render(<KaPian hover>content</KaPian>)
    expect(container.firstChild).toHaveClass('hover:-translate-y-1')
  })

  it('merges custom className', () => {
    const { container } = render(<KaPian className="custom-card">content</KaPian>)
    expect(container.firstChild).toHaveClass('custom-card')
  })

  it('never writes inline transform (pure static container)', () => {
    const { container } = render(<KaPian hover>content</KaPian>)
    const card = container.firstChild as HTMLElement
    expect(card.style.transform).toBe('')
    expect(card).not.toHaveClass('tilt-card')
    expect(card).not.toHaveClass('will-change-transform')
  })
})

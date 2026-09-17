import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>card content</Card>)
    expect(screen.getByText('card content')).toBeInTheDocument()
  })

  it('renders header', () => {
    render(<Card header={<span data-testid="header">header</span>}>content</Card>)
    expect(screen.getByTestId('header')).toBeInTheDocument()
  })

  it('renders footer', () => {
    render(<Card footer={<span data-testid="footer">footer</span>}>content</Card>)
    expect(screen.getByTestId('footer')).toBeInTheDocument()
  })

  it('does not apply glass panel class by default', () => {
    const { container } = render(<Card>content</Card>)
    expect(container.firstChild).not.toHaveClass('glass-panel')
  })

  it('applies baseline static classes without glass leftovers', () => {
    const { container } = render(<Card>content</Card>)
    expect(container.firstChild).toHaveClass('card-container')
    expect(container.firstChild).not.toHaveClass('border')
    expect(container.firstChild).not.toHaveClass('border-border')
    expect(container.firstChild).not.toHaveClass('overflow-hidden')
  })

  it('applies hover lift class', () => {
    const { container } = render(<Card hover>content</Card>)
    expect(container.firstChild).toHaveClass('hover:-translate-y-1')
  })

  it('merges custom className', () => {
    const { container } = render(<Card className="custom-card">content</Card>)
    expect(container.firstChild).toHaveClass('custom-card')
  })

  it('never writes inline transform (pure static container)', () => {
    const { container } = render(<Card hover>content</Card>)
    const card = container.firstChild as HTMLElement
    expect(card.style.transform).toBe('')
    expect(card).not.toHaveClass('tilt-card')
    expect(card).not.toHaveClass('will-change-transform')
  })
})

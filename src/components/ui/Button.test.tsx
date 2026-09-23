import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

const IconMock = () => <span data-testid="icon">*</span>

describe('Button', () => {
  it('renders children', () => {
    render(<Button>click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>click me</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>click me</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows loading spinner and disables button', () => {
    render(<Button loading>click me</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  it('renders icon', () => {
    render(<Button icon={<IconMock />}>click me</Button>)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('applies primary variant class by default', () => {
    const { container } = render(<Button>click me</Button>)
    expect(container.firstChild).toHaveClass('bg-primary')
  })

  it('applies secondary variant class', () => {
    const { container } = render(<Button variant="secondary">click me</Button>)
    expect(container.firstChild).toHaveClass('bg-secondary')
  })

  it('applies ghost variant class', () => {
    const { container } = render(<Button variant="ghost">click me</Button>)
    expect(container.firstChild).toHaveClass('bg-transparent')
  })

  it('applies size classes', () => {
    const { container } = render(<Button size="lg">click me</Button>)
    expect(container.firstChild).toHaveClass('h-12', 'px-6', 'text-base')
  })

  it('merges custom className', () => {
    const { container } = render(<Button className="custom-class">click me</Button>)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})

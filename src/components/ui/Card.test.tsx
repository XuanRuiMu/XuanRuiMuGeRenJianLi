import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Card } from './Card'

let reducedMotionMatches = false

describe('Card', () => {
  beforeEach(() => {
    reducedMotionMatches = false
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        get matches() {
          return reducedMotionMatches
        },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

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

  it('applies border class by default', () => {
    const { container } = render(<Card>content</Card>)
    expect(container.firstChild).toHaveClass('border')
    expect(container.firstChild).toHaveClass('border-border')
  })

  it('applies hover lift class without tilt', () => {
    const { container } = render(<Card hover>content</Card>)
    expect(container.firstChild).toHaveClass('hover:-translate-y-1')
  })

  it('merges custom className', () => {
    const { container } = render(<Card className="custom-card">content</Card>)
    expect(container.firstChild).toHaveClass('custom-card')
  })

  it('applies tilt classes', () => {
    const { container } = render(<Card tilt>content</Card>)
    expect(container.firstChild).toHaveClass('tilt-card')
    expect(container.firstChild).toHaveClass('will-change-transform')
  })

  it('does not apply transform transition class on tilt cards', () => {
    const { container } = render(<Card tilt>content</Card>)
    expect(container.firstChild).not.toHaveClass('transition-transform')
  })

  it('combines hover with tilt without lift transition', () => {
    const { container } = render(
      <Card hover tilt>
        content
      </Card>
    )
    expect(container.firstChild).toHaveClass('hover:shadow-2xl')
    expect(container.firstChild).not.toHaveClass('hover:-translate-y-1')
  })

  it('adds active tilt class on mouse enter', () => {
    const { container } = render(<Card tilt>content</Card>)
    const card = container.firstChild as HTMLElement
    fireEvent.mouseEnter(card)
    expect(card).toHaveClass('is-tilt-active')
  })

  it('removes active tilt class on mouse leave', () => {
    const { container } = render(<Card tilt>content</Card>)
    const card = container.firstChild as HTMLElement
    fireEvent.mouseEnter(card)
    fireEvent.mouseLeave(card)
    expect(card).not.toHaveClass('is-tilt-active')
  })

  it('updates glow position on mouse move', async () => {
    const { container } = render(<Card tilt>content</Card>)
    const card = container.firstChild as HTMLElement
    fireEvent.mouseEnter(card)
    fireEvent.mouseMove(card, { clientX: 100, clientY: 50 })
    await waitFor(() => {
      const glowX = card.style.getPropertyValue('--tilt-glow-x')
      const glowY = card.style.getPropertyValue('--tilt-glow-y')
      expect(glowX).not.toBe('50%')
      expect(glowY).not.toBe('50%')
    })
  })

  it('resets glow position on mouse leave', async () => {
    const { container } = render(<Card tilt>content</Card>)
    const card = container.firstChild as HTMLElement
    fireEvent.mouseEnter(card)
    fireEvent.mouseMove(card, { clientX: 100, clientY: 50 })
    fireEvent.mouseLeave(card)
    await waitFor(() => {
      expect(card.style.getPropertyValue('--tilt-glow-x')).toBe('50%')
      expect(card.style.getPropertyValue('--tilt-glow-y')).toBe('50%')
    })
  })

  it('disables tilt when reduced motion is preferred', () => {
    reducedMotionMatches = true
    const { container } = render(<Card tilt>content</Card>)
    expect(container.firstChild).not.toHaveClass('tilt-card')
    expect(container.firstChild).not.toHaveClass('will-change-transform')
  })

  it('continuously tracks glow position across multiple mouse moves', async () => {
    const { container } = render(<Card tilt>content</Card>)
    const card = container.firstChild as HTMLElement
    const rect = {
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }
    card.getBoundingClientRect = vi.fn(() => rect)

    fireEvent.mouseEnter(card)
    fireEvent.mouseMove(card, { clientX: 50, clientY: 25 })
    await waitFor(() => {
      expect(card.style.getPropertyValue('--tilt-glow-x')).toBe('25%')
      expect(card.style.getPropertyValue('--tilt-glow-y')).toBe('25%')
    })

    fireEvent.mouseMove(card, { clientX: 150, clientY: 75 })
    await waitFor(() => {
      expect(card.style.getPropertyValue('--tilt-glow-x')).toBe('75%')
      expect(card.style.getPropertyValue('--tilt-glow-y')).toBe('75%')
    })
  })

  it('continuously updates tilt transform on repeated mouse moves', async () => {
    const { container } = render(<Card tilt>content</Card>)
    const card = container.firstChild as HTMLElement
    const rect = {
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }
    card.getBoundingClientRect = vi.fn(() => rect)

    const getRotateX = (transform: string) => {
      const match = transform.match(/rotateX\((-?[\d.]+)deg\)/)
      return match ? parseFloat(match[1]) : 0
    }
    const getRotateY = (transform: string) => {
      const match = transform.match(/rotateY\((-?[\d.]+)deg\)/)
      return match ? parseFloat(match[1]) : 0
    }

    fireEvent.mouseEnter(card)
    fireEvent.mouseMove(card, { clientX: 50, clientY: 25 })

    await waitFor(() => {
      expect(getRotateX(card.style.transform)).toBeGreaterThan(0)
      expect(getRotateY(card.style.transform)).toBeLessThan(0)
    })

    fireEvent.mouseMove(card, { clientX: 150, clientY: 75 })

    await waitFor(() => {
      expect(getRotateX(card.style.transform)).toBeLessThan(0)
      expect(getRotateY(card.style.transform)).toBeGreaterThan(0)
    })
  })
})

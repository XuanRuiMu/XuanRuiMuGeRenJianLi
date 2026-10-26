import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KaPian } from './KaPian'

describe('Card', () => {
  it('renders children', () => {
    render(<KaPian>card content</KaPian>)
    expect(screen.getByText('card content')).toBeInTheDocument()
  })

  it('renders header', () => {
    render(<KaPian 头部={<span data-testid="header">header</span>}>content</KaPian>)
    expect(screen.getByTestId('header')).toBeInTheDocument()
  })

  it('renders footer', () => {
    render(<KaPian 页脚={<span data-testid="footer">footer</span>}>content</KaPian>)
    expect(screen.getByTestId('footer')).toBeInTheDocument()
  })

  it('does not apply glass panel class by default', () => {
    const { container: 容器 } = render(<KaPian>content</KaPian>)
    expect(容器.firstChild).not.toHaveClass('glass-panel')
  })

  it('applies baseline static classes without glass leftovers', () => {
    const { container: 容器 } = render(<KaPian>content</KaPian>)
    expect(容器.firstChild).toHaveClass('card-container')
    expect(容器.firstChild).not.toHaveClass('border')
    expect(容器.firstChild).not.toHaveClass('border-border')
    expect(容器.firstChild).not.toHaveClass('overflow-hidden')
  })

  it('applies hover lift class', () => {
    const { container: 容器 } = render(<KaPian 悬停>content</KaPian>)
    expect(容器.firstChild).toHaveClass('hover:-translate-y-1')
  })

  it('merges custom className', () => {
    const { container: 容器 } = render(<KaPian className="custom-card">content</KaPian>)
    expect(容器.firstChild).toHaveClass('custom-card')
  })

  it('never writes inline transform (pure static container)', () => {
    const { container: 容器 } = render(<KaPian 悬停>content</KaPian>)
    const 卡片 = 容器.firstChild as HTMLElement
    expect(卡片.style.transform).toBe('')
    expect(卡片).not.toHaveClass('tilt-card')
    expect(卡片).not.toHaveClass('will-change-transform')
  })
})

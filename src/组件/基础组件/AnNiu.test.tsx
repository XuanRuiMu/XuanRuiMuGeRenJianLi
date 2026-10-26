import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AnNiu } from './AnNiu'

const TuBiaoCeShiTiShen = () => <span data-testid="icon">*</span>

describe('Button', () => {
  it('renders children', () => {
    render(<AnNiu>click me</AnNiu>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<AnNiu onClick={handleClick}>click me</AnNiu>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<AnNiu disabled>click me</AnNiu>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows loading spinner and disables button', () => {
    render(<AnNiu loading>click me</AnNiu>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  it('renders icon', () => {
    render(<AnNiu 图标={<TuBiaoCeShiTiShen />}>click me</AnNiu>)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('applies primary variant class by default', () => {
    const { container: 容器 } = render(<AnNiu>click me</AnNiu>)
    expect(容器.firstChild).toHaveClass('bg-primary')
  })

  it('applies secondary variant class', () => {
    const { container: 容器 } = render(<AnNiu 变体="secondary">click me</AnNiu>)
    expect(容器.firstChild).toHaveClass('bg-secondary')
  })

  it('applies ghost variant class', () => {
    const { container: 容器 } = render(<AnNiu 变体="ghost">click me</AnNiu>)
    expect(容器.firstChild).toHaveClass('bg-transparent')
  })

  it('applies size classes', () => {
    const { container: 容器 } = render(<AnNiu 尺寸="lg">click me</AnNiu>)
    expect(容器.firstChild).toHaveClass('h-12', 'px-6', 'text-base')
  })

  it('merges custom className', () => {
    const { container: 容器 } = render(<AnNiu className="custom-class">click me</AnNiu>)
    expect(容器.firstChild).toHaveClass('custom-class')
  })
})

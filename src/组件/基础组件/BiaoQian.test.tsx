import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BiaoQian } from './BiaoQian'

describe('Tag', () => {
  it('renders children', () => {
    render(<BiaoQian>react</BiaoQian>)
    expect(screen.getByText('react')).toBeInTheDocument()
  })

  it('uses small text size', () => {
    const { container: 容器 } = render(<BiaoQian>react</BiaoQian>)
    expect(容器.firstChild).toHaveClass('text-[10px]')
  })

  it('merges custom className', () => {
    const { container: 容器 } = render(<BiaoQian className="custom-tag">react</BiaoQian>)
    expect(容器.firstChild).toHaveClass('custom-tag')
  })
})

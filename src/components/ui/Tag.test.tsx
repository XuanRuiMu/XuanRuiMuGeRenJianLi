import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Tag } from './Tag'

describe('Tag', () => {
  it('renders children', () => {
    render(<Tag>react</Tag>)
    expect(screen.getByText('react')).toBeInTheDocument()
  })

  it('uses small text size', () => {
    const { container } = render(<Tag>react</Tag>)
    expect(container.firstChild).toHaveClass('text-[10px]')
  })

  it('merges custom className', () => {
    const { container } = render(<Tag className="custom-tag">react</Tag>)
    expect(container.firstChild).toHaveClass('custom-tag')
  })
})

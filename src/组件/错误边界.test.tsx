import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CuoWuBianJie } from './错误边界'

const ThrowError = () => {
  throw new Error('boom')
}

describe('错误边界', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children when no error', () => {
    render(
      <CuoWuBianJie>
        <div data-testid="child">safe</div>
      </CuoWuBianJie>
    )
    expect(screen.getByTestId('child')).toHaveTextContent('safe')
  })

  it('renders fallback ui when error is thrown', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <CuoWuBianJie>
        <ThrowError />
      </CuoWuBianJie>
    )
    expect(screen.getByText('页面暂时无法显示')).toBeInTheDocument()
    consoleError.mockRestore()
  })
})

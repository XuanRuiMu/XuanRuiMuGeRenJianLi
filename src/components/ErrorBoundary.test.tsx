import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

const ThrowError = () => {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">safe</div>
      </ErrorBoundary>
    )
    expect(screen.getByTestId('child')).toHaveTextContent('safe')
  })

  it('renders fallback ui when error is thrown', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    expect(screen.getByText('页面暂时无法显示')).toBeInTheDocument()
    consoleError.mockRestore()
  })
})

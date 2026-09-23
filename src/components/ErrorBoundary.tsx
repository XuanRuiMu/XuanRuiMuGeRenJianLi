import { Component, type ErrorInfo, type ReactNode } from 'react'
import { errorReporter } from '../observability/errorReporter'
import { t } from '../i18n/translations'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    errorReporter.report(error, {
      category: 'render',
      componentStack: errorInfo.componentStack ?? undefined,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg p-6 text-center">
          <div className="max-w-md rounded-2xl border border-border bg-surface p-8 backdrop-blur-xl">
            <h2 className="mb-2 text-2xl font-medium text-text-primary">{t('error.title')}</h2>
            <p className="mb-6 text-sm text-text-secondary">{t('error.description')}</p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mb-6 max-h-40 overflow-auto rounded-lg bg-black/40 p-3 text-left text-xs text-red-300">
                {this.state.error.toString()}
                {'\n'}
                {this.state.errorInfo?.componentStack || ''}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              className="rounded-full bg-primary/10 px-6 py-2.5 text-sm text-text-primary transition-colors hover:bg-primary/20"
            >
              {t('error.reload')}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

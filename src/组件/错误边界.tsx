import { Component, type ErrorInfo, type ReactNode } from 'react'
import { 错误上报器实例 } from '../可观测/错误上报器'
import { t } from '../国际化/翻译'

interface 错误边界属性 {
  children: ReactNode
  兜底?: ReactNode
}

interface 错误边界状态 {
  有错误: boolean
  error: Error | null
  错误信息: ErrorInfo | null
}

export class CuoWuBianJie extends Component<错误边界属性, 错误边界状态> {
  constructor(props: 错误边界属性) {
    super(props)
    this.state = { 有错误: false, error: null, 错误信息: null }
  }

  static getDerivedStateFromError(错误: Error): 错误边界状态 {
    return { 有错误: true, error: 错误, 错误信息: null }
  }

  componentDidCatch(错误: Error, 错误信息: ErrorInfo) {
    this.setState({ 错误信息 })
    错误上报器实例.报告(错误, {
      category: 'render',
      componentStack: 错误信息.componentStack ?? undefined,
    })
  }

  处理刷新 = () => {
    window.location.reload()
  }

  render() {
    if (this.state.有错误) {
      if (this.props.兜底) return this.props.兜底

      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg p-6 text-center">
          <div className="max-w-md rounded-2xl border border-border bg-surface p-8 backdrop-blur-xl">
            <h2 className="mb-2 text-2xl font-medium text-text-primary">{t('error.title')}</h2>
            <p className="mb-6 text-sm text-text-secondary">{t('error.description')}</p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mb-6 max-h-40 overflow-auto rounded-lg bg-black/40 p-3 text-left text-xs text-red-300">
                {this.state.error.toString()}
                {'\n'}
                {this.state.错误信息?.componentStack || ''}
              </pre>
            )}
            <button
              onClick={this.处理刷新}
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

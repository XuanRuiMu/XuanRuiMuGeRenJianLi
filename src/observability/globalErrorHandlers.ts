import { errorReporter } from './errorReporter'
import { logger } from './logger'

export function installGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return

  window.addEventListener(
    'error',
    (event) => {
      errorReporter.report(event.error ?? new Error(event.message), {
        category: 'runtime',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      })
    },
    true
  )

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event.reason
      if (reason instanceof Error) {
        errorReporter.report(reason, { category: 'runtime' })
      } else {
        errorReporter.report(new Error(String(reason)), {
          category: 'runtime',
          context: { rawReason: reason },
        })
      }
    },
    true
  )

  // 监控 WebGL/WebGPU context lost
  document.addEventListener('webglcontextlost', (event) => {
    logger.warn('WebGL context lost', { target: (event.target as Element)?.tagName })
    errorReporter.report(new Error('WebGL context lost'), {
      category: 'webgl',
      context: { target: (event.target as Element)?.tagName },
    })
  })

  document.addEventListener('webglcontextrestored', () => {
    logger.info('WebGL context restored')
  })

  // 页面可见性变化日志（用于性能分析）
  document.addEventListener('visibilitychange', () => {
    logger.debug('Visibility changed', { hidden: document.hidden })
  })
}

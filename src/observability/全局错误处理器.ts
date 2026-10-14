import { 错误上报器实例 } from './错误上报器'
import { 日志器实例 } from './日志器'

export function 安装全局错误处理器(): void {
  if (typeof window === 'undefined') return

  window.addEventListener(
    'error',
    (event) => {
      错误上报器实例.report(event.error ?? new Error(event.message), {
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
        错误上报器实例.report(reason, { category: 'runtime' })
      } else {
        错误上报器实例.report(new Error(String(reason)), {
          category: 'runtime',
          context: { rawReason: reason },
        })
      }
    },
    true
  )

  // 监控 WebGL/WebGPU context lost
  document.addEventListener('webglcontextlost', (event) => {
    日志器实例.warn('WebGL context lost', { target: (event.target as Element)?.tagName })
    错误上报器实例.report(new Error('WebGL context lost'), {
      category: 'webgl',
      context: { target: (event.target as Element)?.tagName },
    })
  })

  document.addEventListener('webglcontextrestored', () => {
    日志器实例.info('WebGL context restored')
  })

  // 页面可见性变化日志（用于性能分析）
  document.addEventListener('visibilitychange', () => {
    日志器实例.debug('Visibility changed', { hidden: document.hidden })
  })
}

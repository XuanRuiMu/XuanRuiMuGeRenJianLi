import { 错误上报器实例 } from './错误上报器'
import { 日志器实例 } from './日志器'

export function 安装全局错误处理器(): void {
  if (typeof window === 'undefined') return

  window.addEventListener(
    'error',
    (事件) => {
      错误上报器实例.报告(事件.error ?? new Error(事件.message), {
        category: 'runtime',
        context: {
          filename: 事件.filename,
          lineno: 事件.lineno,
          colno: 事件.colno,
        },
      })
    },
    true
  )

  window.addEventListener(
    'unhandledrejection',
    (事件) => {
      const 原因 = 事件.reason
      if (原因 instanceof Error) {
        错误上报器实例.报告(原因, { category: 'runtime' })
      } else {
        错误上报器实例.报告(new Error(String(原因)), {
          category: 'runtime',
          context: { rawReason: 原因 },
        })
      }
    },
    true
  )

  document.addEventListener('webglcontextlost', (事件) => {
    日志器实例.warn('WebGL context lost', { target: (事件.target as Element)?.tagName })
    错误上报器实例.报告(new Error('WebGL context lost'), {
      category: 'webgl',
      context: { target: (事件.target as Element)?.tagName },
    })
  })

  document.addEventListener('webglcontextrestored', () => {
    日志器实例.信息('WebGL context restored')
  })

  document.addEventListener('visibilitychange', () => {
    日志器实例.debug('Visibility changed', { hidden: document.hidden })
  })
}

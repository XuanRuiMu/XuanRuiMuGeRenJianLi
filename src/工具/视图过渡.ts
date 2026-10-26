import { 日志器实例 } from '../可观测/日志器'

export interface 圆形揭示原点 {
  横: number
  纵: number
}

interface 视图过渡API {
  startViewTransition?: (更新回调: () => void | Promise<void>) => {
    ready: Promise<void>
    finished: Promise<void>
    updateCallbackDone: Promise<void>
    skipTransition: () => void
  }
}

export function 是否支持视图过渡(): boolean {
  return (
    typeof document !== 'undefined' && typeof (document as unknown as 视图过渡API).startViewTransition === 'function'
  )
}

export async function 启动视图过渡(更新回调: () => void | Promise<void>): Promise<void> {
  const 文档 = document as unknown as 视图过渡API

  if (!文档.startViewTransition) {
    await 更新回调()
    return
  }

  try {
    const 过渡 = 文档.startViewTransition(更新回调)
    await 过渡.updateCallbackDone
    await 过渡.ready
    await 过渡.finished
  } catch (错误) {
    日志器实例.warn('View transition failed', { error: String(错误) })
    await 更新回调()
  }
}

export async function 启动圆形揭示过渡(更新回调: () => void | Promise<void>, 原点: 圆形揭示原点): Promise<void> {
  const 文档 = document as unknown as 视图过渡API

  if (!文档.startViewTransition) {
    await 更新回调()
    return
  }

  const 根元素 = document.documentElement

  const 包裹回调 = () => {
    根元素.style.setProperty('--circular-origin-x', `${原点.横}px`)
    根元素.style.setProperty('--circular-origin-y', `${原点.纵}px`)
    根元素.classList.add('circular-reveal-active')
    return 更新回调()
  }

  try {
    const 过渡 = 文档.startViewTransition(包裹回调)
    await 过渡.updateCallbackDone
    await 过渡.ready
    await 过渡.finished
  } catch (错误) {
    日志器实例.warn('Circular reveal transition failed', { error: String(错误) })
    await 包裹回调()
  } finally {
    根元素.classList.remove('circular-reveal-active')
    根元素.style.removeProperty('--circular-origin-x')
    根元素.style.removeProperty('--circular-origin-y')
  }
}

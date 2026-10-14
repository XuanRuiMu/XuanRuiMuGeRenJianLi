import { logger } from '../observability/logger'

export interface 圆形揭示原点 {
  横: number
  纵: number
}

interface 视图过渡API {
  // document.startViewTransition 是浏览器 DOM API（框架契约，不纳入中文化范围）
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
  const doc = document as unknown as 视图过渡API

  if (!doc.startViewTransition) {
    await 更新回调()
    return
  }

  try {
    const transition = doc.startViewTransition(更新回调)
    await transition.updateCallbackDone
    await transition.ready
    await transition.finished
  } catch (err) {
    logger.warn('View transition failed', { error: String(err) })
    await 更新回调()
  }
}

export async function 启动圆形揭示过渡(更新回调: () => void | Promise<void>, 原点: 圆形揭示原点): Promise<void> {
  const doc = document as unknown as 视图过渡API

  if (!doc.startViewTransition) {
    await 更新回调()
    return
  }

  const root = document.documentElement

  const 包裹回调 = () => {
    root.style.setProperty('--circular-origin-x', `${原点.横}px`)
    root.style.setProperty('--circular-origin-y', `${原点.纵}px`)
    root.classList.add('circular-reveal-active')
    return 更新回调()
  }

  try {
    const transition = doc.startViewTransition(包裹回调)
    await transition.updateCallbackDone
    await transition.ready
    await transition.finished
  } catch (err) {
    logger.warn('Circular reveal transition failed', { error: String(err) })
    await 包裹回调()
  } finally {
    root.classList.remove('circular-reveal-active')
    root.style.removeProperty('--circular-origin-x')
    root.style.removeProperty('--circular-origin-y')
  }
}

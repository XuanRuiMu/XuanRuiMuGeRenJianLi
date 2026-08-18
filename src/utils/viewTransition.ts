import { logger } from '../observability/logger'

export interface CircularRevealOrigin {
  x: number
  y: number
}

interface ViewTransitionAPI {
  startViewTransition?: (updateCallback: () => void | Promise<void>) => {
    ready: Promise<void>
    finished: Promise<void>
    updateCallbackDone: Promise<void>
    skipTransition: () => void
  }
}

export function isViewTransitionSupported(): boolean {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function'
}

export async function startViewTransition(updateCallback: () => void | Promise<void>): Promise<void> {
  const doc = document as unknown as ViewTransitionAPI

  if (!doc.startViewTransition) {
    await updateCallback()
    return
  }

  try {
    const transition = doc.startViewTransition(updateCallback)
    await transition.updateCallbackDone
    await transition.ready
    await transition.finished
  } catch (err) {
    logger.warn('View transition failed', { error: String(err) })
    await updateCallback()
  }
}

export async function startCircularRevealTransition(
  updateCallback: () => void | Promise<void>,
  origin: CircularRevealOrigin
): Promise<void> {
  const doc = document as unknown as ViewTransitionAPI

  if (!doc.startViewTransition) {
    await updateCallback()
    return
  }

  const root = document.documentElement

  const wrappedCallback = () => {
    root.style.setProperty('--circular-origin-x', `${origin.x}px`)
    root.style.setProperty('--circular-origin-y', `${origin.y}px`)
    root.classList.add('circular-reveal-active')
    return updateCallback()
  }

  try {
    const transition = doc.startViewTransition(wrappedCallback)
    await transition.updateCallbackDone
    await transition.ready
    await transition.finished
  } catch (err) {
    logger.warn('Circular reveal transition failed', { error: String(err) })
    await wrappedCallback()
  } finally {
    root.classList.remove('circular-reveal-active')
    root.style.removeProperty('--circular-origin-x')
    root.style.removeProperty('--circular-origin-y')
  }
}

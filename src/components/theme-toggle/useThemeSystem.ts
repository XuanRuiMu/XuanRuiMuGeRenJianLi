import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore, type AppTheme } from '../../store/useAppStore'
import {
  startViewTransition,
  startCircularRevealTransition,
  type CircularRevealOrigin,
} from '../../utils/viewTransition'

const STORAGE_KEY = 'xrm-theme'

export interface SetThemeOptions {
  origin?: CircularRevealOrigin
}

function resolveTheme(theme: AppTheme): 'dark' | 'light' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function useThemeSystem() {
  const theme = useAppStore((state) => state.theme)
  const reducedMotion = useAppStore((state) => state.reducedMotion)
  const setThemeStore = useAppStore((state) => state.setTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')
  const pendingOriginRef = useRef<CircularRevealOrigin | null>(null)

  const applyTheme = useCallback(
    (next: AppTheme) => {
      const resolved = resolveTheme(next)
      const update = () => {
        setResolvedTheme(resolved)
        const root = document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(resolved)
        root.style.colorScheme = resolved
      }
      const origin = pendingOriginRef.current
      pendingOriginRef.current = null
      if (origin && !reducedMotion) {
        startCircularRevealTransition(update, origin)
      } else {
        startViewTransition(update)
      }
    },
    [reducedMotion]
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme, applyTheme])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'system') {
        applyTheme('system')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme, applyTheme])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === 'dark' || stored === 'light' || stored === 'system') {
        setThemeStore(stored)
      }
    } catch {
      // ignore storage errors
    }
  }, [setThemeStore])

  const setTheme = useCallback(
    (next: AppTheme, options?: SetThemeOptions) => {
      pendingOriginRef.current = options?.origin ?? null
      setThemeStore(next)
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // ignore storage errors
      }
    },
    [setThemeStore]
  )

  return { theme, resolvedTheme, setTheme }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useYingYongZhuangTai, type 应用主题 } from '../../状态/应用状态仓库'
import { 启动视图过渡, 启动圆形揭示过渡, type 圆形揭示原点 } from '../../工具/视图过渡'

const STORAGE_KEY = 'xrm-theme'

export interface 设置主题选项 {
  origin?: 圆形揭示原点
}

function resolveTheme(theme: 应用主题): 'dark' | 'light' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function useZhuTiXiTong() {
  const theme = useYingYongZhuangTai((state) => state.theme)
  const reducedMotion = useYingYongZhuangTai((state) => state.reducedMotion)
  const setThemeStore = useYingYongZhuangTai((state) => state.setTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')
  const pendingOriginRef = useRef<圆形揭示原点 | null>(null)

  const applyTheme = useCallback(
    (next: 应用主题) => {
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
        启动圆形揭示过渡(update, origin)
      } else {
        启动视图过渡(update)
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
    (next: 应用主题, options?: 设置主题选项) => {
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

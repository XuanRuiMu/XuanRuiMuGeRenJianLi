import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { usePerformanceProfile } from '../../hooks/usePerformanceProfile'
import { createStarryControlPanel, createStarryGalaxyScene, type StarryGalaxySceneApi } from './StarryGalaxyScene'
import { useIsDarkMode } from './useIsDarkMode'
import { starrySceneRef } from '../../lib/starrySceneRef'
import { useStarryUiStore } from '../../store/useStarryUiStore'

interface StarryGalaxyBackgroundProps {
  className?: string
  children?: ReactNode
}

export function StarryGalaxyBackground({ className, children }: StarryGalaxyBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [, setApi] = useState<StarryGalaxySceneApi | null>(null)
  const { settings, loading } = usePerformanceProfile()
  const reducedMotion = useReducedMotion()
  const isDark = useIsDarkMode()
  const starryHidden = useStarryUiStore((s) => s.starryHidden)

  // FP-05：控制台与场景解耦——始终构建（DOM 存在时），不论场景是否创建。
  // 这保证「彻底隐藏星空」时控制台依然有内容，可继续调整参数（只是看不到效果）。
  useEffect(() => {
    createStarryControlPanel()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || reducedMotion || !isDark) return
    // 彻底隐藏星空：根因级修复 —— 不创建场景，WebGL 动画循环随之不启动，不消耗 GPU/CPU
    if (starryHidden) return
    const container = containerRef.current
    if (!container) return

    const dpr = Array.isArray(settings.dpr) ? settings.dpr[0] : settings.dpr
    const scene = createStarryGalaxyScene(container, { dpr })
    setApi(scene)
    starrySceneRef.current = scene

    return () => {
      scene.destroy()
      starrySceneRef.current = null
      setApi(null)
    }
  }, [settings, reducedMotion, isDark, starryHidden])

  const showCanvas = isDark && !loading && !reducedMotion && !starryHidden

  // starryHidden 开启时使用简单纯色背景（深黑/浅白）；关闭时维持原有回退样式
  const fallbackClass = starryHidden
    ? isDark
      ? 'bg-black'
      : 'bg-white'
    : isDark
      ? 'bg-[#05060f]'
      : 'bg-transparent'

  return (
    <div
      ref={containerRef}
      className={cn('fixed inset-0 z-0', showCanvas ? '' : fallbackClass, className)}
      aria-hidden="true"
      data-testid={showCanvas ? 'starry-background-canvas' : 'starry-background-fallback'}
    >
      {children}
    </div>
  )
}

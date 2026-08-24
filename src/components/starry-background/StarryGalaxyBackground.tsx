import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { usePerformanceProfile } from '../../hooks/usePerformanceProfile'
import { createStarryControlPanel, createStarryGalaxyScene, type StarryGalaxySceneApi } from './StarryGalaxyScene'
import { useIsDarkMode } from './useIsDarkMode'
import { starrySceneRef } from '../../lib/starrySceneRef'
import { useStarryUiStore } from '../../store/useStarryUiStore'
import { TeldrassilFireRenderer } from './TeldrassilFireRenderer'

interface StarryGalaxyBackgroundProps {
  className?: string
  children?: ReactNode
}

// LightWallpaper滚动系数：每垂直滚动 1px，壁纸下移该系数 px（与星空视差同款"轻微呼吸感"）
const 壁纸滚动系数 = 0.06
// 位移上限 < CSS 溢出预留（320px），任何页面长度下都不会露底
const 壁纸位移上限 = 280
// 静态底图（真实 CG 帧）固有像素尺寸，粒子层据此做 object-cover 对齐
const 底图固有宽 = 1920
const 底图固有高 = 810

/**
 * 浅色模式壁纸层：fixed 铺满（CSS 纵向各溢出 320px 预留位移空间）。
 * 画面 = 真实 CG 静态底图「燃烧的泰达希尔」（object-cover 铺满）
 * + Canvas 火焰粒子动效层（火星/余烬/火光闪烁，见 TeldrassilFireRenderer）。
 * 底图绝对静止——只有粒子动，严格满足"禁止镜头移动"要求；
 * 滚动时 rAF 合帧后整层轻微下移（与星空背景同款滚动视差）；
 * reduced-motion 时不挂载粒子层，仅显示静态底图。
 */
function LightWallpaper({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const 动效层ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reducedMotion) return
    let raf = 0
    const 应用位移 = () => {
      raf = 0
      const el = ref.current
      if (!el) return
      const shift = Math.min(window.scrollY * 壁纸滚动系数, 壁纸位移上限)
      el.style.transform = `translate3d(0, ${shift}px, 0)`
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(应用位移)
    }
    应用位移()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion) return
    const container = 动效层ref.current
    if (!container) return
    let renderer: TeldrassilFireRenderer | null = null
    try {
      renderer = new TeldrassilFireRenderer({ imageWidth: 底图固有宽, imageHeight: 底图固有高 })
    } catch {
      return
    }
    const 已建渲染器 = renderer
    已建渲染器.mount(container)
    return () => {
      已建渲染器.unmount()
    }
  }, [reducedMotion])

  return (
    <div
      ref={ref}
      className="light-wallpaper"
      aria-hidden="true"
      data-testid="light-wallpaper"
      data-static={reducedMotion ? 'true' : 'false'}
    >
      <div ref={动效层ref} className="absolute inset-0" data-testid="fire-layer">
        <img
          src="/images/teldrassil-burning-base.webp"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          data-testid="teldrassil-base"
        />
      </div>
    </div>
  )
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
  // 浅色模式壁纸：星空隐藏开关同时管住壁纸（控制面板文案"彻底隐藏星空背景和壁纸"）
  const showWallpaper = !isDark && !starryHidden

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
      {showWallpaper && <LightWallpaper reducedMotion={reducedMotion} />}
      {children}
    </div>
  )
}


import { useEffect, useRef, useState, type ReactNode } from 'react'
import { 合并类名 } from '../../库/工具'
import { useJianShaoDongHua } from '../../钩子/useJianShaoDongHua'
import { useXingNengDangWei } from '../../钩子/useXingNengDangWei'
import { 创建星空控制面板, 创建星空星系场景, type 星空星系场景接口 } from './星空星系场景'
import { useShiFouAnSe } from './useShiFouAnSe'
import { 星空场景引用 } from '../../库/星空场景引用'
import { useXingKongKaiGuan } from '../../状态/星空开关仓库'

interface StarryGalaxyBackgroundProps {
  className?: string
  children?: ReactNode
}

// LightWallpaper滚动系数：每垂直滚动 1px，壁纸下移该系数 px（与星空视差同款"轻微呼吸感"）
const 壁纸滚动系数 = 0.06
// 位移上限 < CSS 溢出预留（320px），任何页面长度下都不会露底
const 壁纸位移上限 = 280
// 用户 2026-08-25 参数网页实调回传的《神奈川冲浪里》调色参数（提亮 + 适中反差 + 轻抬白）
const 壁纸滤镜 = 'brightness(1.15) contrast(0.88)'
const 壁纸抬白浓度 = 0.38

/**
 * 浅色模式壁纸层：fixed 铺满（CSS 纵向各溢出 320px 预留位移空间）。
 * 画面 = 公有领域名画《神奈川冲浪里》（北斋，大都会美术馆 CC0 扫描件）微动循环，
 * 纯周期位移构造保证零跳变无缝循环；整层应用实调滤镜 + 抬白叠加实现"整体偏白"。
 * 底图 <img> 作为视频加载前的占位与 reduced-motion 降级；
 * 滚动时 rAF 合帧后整层轻微下移（与星空背景同款滚动视差）；
 * reduced-motion 时不挂载视频，仅显示静态底图。
 */
function LightWallpaper({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

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

  return (
    <div
      ref={ref}
      className="light-wallpaper"
      aria-hidden="true"
      data-testid="light-wallpaper"
      data-static={reducedMotion ? 'true' : 'false'}
    >
      <img
        src="/images/kanagawa-wave-base.webp"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ filter: 壁纸滤镜 }}
        data-testid="kanagawa-base"
      />
      {!reducedMotion && (
        <video
          src="/videos/kanagawa-wave-loop.mp4"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{
            filter: 壁纸滤镜,
            animation: 'wallpaper-pulse 8s ease-in-out infinite',
          }}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          data-testid="kanagawa-video"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-white" style={{ opacity: 壁纸抬白浓度 }} />
    </div>
  )
}

export function XingKongXiXiBeiJing({ className, children }: StarryGalaxyBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [, setApi] = useState<星空星系场景接口 | null>(null)
  const { 设置, 加载中 } = useXingNengDangWei()
  const reducedMotion = useJianShaoDongHua()
  const isDark = useShiFouAnSe()
  const starryHidden = useXingKongKaiGuan((s) => s.starryHidden)

  // FP-05：控制台与场景解耦——始终构建（DOM 存在时），不论场景是否创建。
  // 这保证「彻底隐藏星空」时控制台依然有内容，可继续调整参数（只是看不到效果）。
  useEffect(() => {
    创建星空控制面板()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || reducedMotion || !isDark) return
    // 彻底隐藏星空：根因级修复 —— 不创建场景，WebGL 动画循环随之不启动，不消耗 GPU/CPU
    if (starryHidden) return
    const container = containerRef.current
    if (!container) return

    const dpr = Array.isArray(设置.dpr) ? 设置.dpr[0] : 设置.dpr
    const scene = 创建星空星系场景(container, { dpr })
    setApi(scene)
    星空场景引用.current = scene

    return () => {
      scene.destroy()
      星空场景引用.current = null
      setApi(null)
    }
  }, [设置, reducedMotion, isDark, starryHidden])

  const showCanvas = isDark && !加载中 && !reducedMotion && !starryHidden
  // 浅色模式壁纸：星空隐藏开关同时管住壁纸（控制面板文案"彻底隐藏星空背景和壁纸"）
  const showWallpaper = !isDark && !starryHidden

  // starryHidden 开启时使用简单纯色背景（深黑/浅白）；关闭时维持原有回退样式
  const fallbackClass = starryHidden ? (isDark ? 'bg-black' : 'bg-white') : isDark ? 'bg-[#05060f]' : 'bg-transparent'

  return (
    <div
      ref={containerRef}
      className={合并类名('fixed inset-0 z-0', showCanvas ? '' : fallbackClass, className)}
      aria-hidden="true"
      data-testid={showCanvas ? 'starry-background-canvas' : 'starry-background-fallback'}
    >
      {showWallpaper && <LightWallpaper reducedMotion={reducedMotion} />}
      {children}
    </div>
  )
}

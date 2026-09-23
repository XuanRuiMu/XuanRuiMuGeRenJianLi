import { type ReactNode, useEffect } from 'react'
import { ReactLenis, useLenis } from 'lenis/react'
import type Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { lenisRef } from '../lib/lenisInstance'
import { starrySceneRef } from '../lib/starrySceneRef'

// 重度黏滞：lerp 越小越「黏」、缓冲越长。0.06 比 Lenis 默认 0.1 明显更拖、存在感更强。
const 缓动系数 = 0.06

// 原生滚动与惯性逐帧写入的偏差阈值（px）。超过即判定为「非 Lenis 自身写入」的外部滚动。
const 接管偏差阈值 = 2

/**
 * 桥接组件：必须置于 <ReactLenis> 内部以访问上下文。
 * 1. 把 Lenis 实例写入模块级单例，供锚点跳转使用；
 * 2. 把每帧平滑后的滚动值喂给星空场景（starrySceneRef），由场景在 3D 内部偏移主星群，
 *    制造「背景随滚动缓缓漂移」的纵深视差。背景容器固定为视口大小（inset-0），
 *    画布自带纯色背景始终铺满视口 → 不放大、不露底。
 * 3. 根因修复（FP-01）：惯性动画（isScrolling==='smooth'）进行中，若用户拖动原生滚动条
 *    或键盘滚动，浏览器会产生「非 Lenis 写入」的原生滚动事件。Lenis 的 onNativeScroll 仅在校验
 *    isScrolling 为 false / 'native' 时才同步，smooth 态下会忽略该事件，导致其逐帧 scrollTo
 *    继续按旧 target 覆盖用户位置，二者互搏 → 在落点与终点间来回跳。此处检测到偏差即 reset()
 *    中止惯性并接管原生位置，后续原生滚动事件交由 Lenis 的 native 分支正常同步。
 * 4. 根因修复（FP-03）：挂载即把页面拉回顶部，避免硬刷新后停留在非顶部位置。
 */
function LenisBridge(): null {
  const lenis = useLenis((实例: Lenis) => {
    lenisRef.current = 实例
    starrySceneRef.current?.setParallax(实例.scroll)
  })

  useEffect(() => {
    const 实例 = lenisRef.current
    if (!实例) return

    // 挂载归顶：立即吸附到顶部，不带动画。force 越过 stopped/locked 守卫。
    实例.scrollTo(0, { immediate: true, force: true })

    const 接管保护 = () => {
      const 当前 = lenisRef.current
      if (!当前 || 当前.isScrolling !== 'smooth') return
      if (Math.abs(当前.actualScroll - 当前.animatedScroll) > 接管偏差阈值) {
        // 中止惯性并把 Lenis 状态吸附到用户拖到的原生位置；immediate 内部会 reset() 停止补间。
        当前.scrollTo(当前.actualScroll, { immediate: true, force: true })
      }
    }
    window.addEventListener('scroll', 接管保护, { passive: true })
    return () => window.removeEventListener('scroll', 接管保护)
  }, [lenis])

  return null
}

interface SmoothScrollProps {
  children: ReactNode
}

export function SmoothScroll({ children }: SmoothScrollProps) {
  const 减少动画 = useReducedMotion()

  // 根因修复（FP-03）：禁用浏览器滚动恢复，避免 Ctrl+Shift+R 硬刷新后停留在非顶部位置。
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
    // 无 Lenis 时（减少动画）也兜底归顶；有 Lenis 时由 LenisBridge 的 scrollTo 处理。
    window.scrollTo(0, 0)
  }, [])

  // 尊重减少动画偏好：不挂载 Lenis，退回原生滚动。
  if (减少动画) {
    return <>{children}</>
  }

  return (
    <ReactLenis
      root
      options={{
        lerp: 缓动系数,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 1,
      }}
    >
      <LenisBridge />
      {children}
    </ReactLenis>
  )
}

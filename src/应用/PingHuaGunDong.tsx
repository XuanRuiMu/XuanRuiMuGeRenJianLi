import { type ReactNode, useEffect } from 'react'
import { ReactLenis, useLenis } from 'lenis/react'
import type Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { useJianShaoDongHua } from '../钩子/useJianShaoDongHua'
import { 平滑滚动引用 } from '../库/平滑滚动实例'
import { 星空场景引用 } from '../库/星空场景引用'

const 缓动系数 = 0.06

const 接管偏差阈值 = 2

function PingHuaQiao(): null {
  const 平滑滚动 = useLenis((实例: Lenis) => {
    平滑滚动引用.current = 实例
    星空场景引用.current?.设置视差(实例.scroll)
  })

  useEffect(() => {
    const 实例 = 平滑滚动引用.current
    if (!实例) return

    实例.scrollTo(0, { immediate: true, force: true })

    const 接管保护 = () => {
      const 当前 = 平滑滚动引用.current
      if (!当前 || 当前.isScrolling !== 'smooth') return
      if (Math.abs(当前.actualScroll - 当前.animatedScroll) > 接管偏差阈值) {
        当前.scrollTo(当前.actualScroll, { immediate: true, force: true })
      }
    }
    window.addEventListener('scroll', 接管保护, { passive: true })
    return () => window.removeEventListener('scroll', 接管保护)
  }, [平滑滚动])

  return null
}

interface 平滑滚动属性 {
  children: ReactNode
}

export function PingHuaGunDong({ children }: 平滑滚动属性) {
  const 减少动画 = useJianShaoDongHua()

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }

    window.scrollTo(0, 0)
  }, [])

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
      <PingHuaQiao />
      {children}
    </ReactLenis>
  )
}

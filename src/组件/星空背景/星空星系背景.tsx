import { useEffect, useRef, useState, type ReactNode } from 'react'
import { 合并类名 } from '../../库/工具'
import { 资源路径 } from '../../库/资源路径'
import { useJianShaoDongHua } from '../../钩子/useJianShaoDongHua'
import { useXingNengDangWei } from '../../钩子/useXingNengDangWei'
import type { 星空星系场景接口 } from './星空星系场景'
import { 当页面加载完毕且空闲 } from '../../工具/空闲加载'
import { useShiFouAnSe } from './useShiFouAnSe'
import { 星空场景引用 } from '../../库/星空场景引用'
import { useXingKongKaiGuan } from '../../状态/星空开关仓库'

interface 星空星系背景属性 {
  className?: string
  children?: ReactNode
}

const 壁纸滚动系数 = 0.06

const 壁纸位移上限 = 280

const 壁纸滤镜 = 'brightness(1.15) contrast(0.88)'
const 壁纸抬白浓度 = 0.38

function QianSeBiZhi({ 减少动画 }: { 减少动画: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const 视频引用 = useRef<HTMLVideoElement>(null)
  const [视频开始加载, 设置视频开始加载] = useState(false)
  const [视频就绪, 设置视频就绪] = useState(false)

  useEffect(() => {
    if (减少动画) return
    return 当页面加载完毕且空闲(() => 设置视频开始加载(true))
  }, [减少动画])

  const 视频可播放 = () => {
    设置视频就绪(true)
    void 视频引用.current?.play().catch(() => {})
  }

  useEffect(() => {
    if (减少动画) return
    let 帧请求 = 0
    const 应用位移 = () => {
      帧请求 = 0
      const 元素 = ref.current
      if (!元素) return
      const 偏移 = Math.min(window.scrollY * 壁纸滚动系数, 壁纸位移上限)
      元素.style.transform = `translate3d(0, ${偏移}px, 0)`
    }
    const onScroll = () => {
      if (!帧请求) 帧请求 = requestAnimationFrame(应用位移)
    }
    应用位移()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (帧请求) cancelAnimationFrame(帧请求)
    }
  }, [减少动画])

  return (
    <div
      ref={ref}
      className="light-wallpaper"
      aria-hidden="true"
      data-testid="light-wallpaper"
      data-static={减少动画 || !视频就绪 ? 'true' : 'false'}
    >
      <img
        src={资源路径('/images/kanagawa-wave-base.webp')}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ filter: 壁纸滤镜 }}
        data-testid="kanagawa-base"
      />
      {!减少动画 && 视频开始加载 && (
        <video
          ref={视频引用}
          src={资源路径('/videos/kanagawa-wave-loop.mp4')}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{
            filter: 壁纸滤镜,
            animation: 'wallpaper-pulse 8s ease-in-out infinite',
            opacity: 视频就绪 ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
          autoPlay={视频就绪}
          muted
          loop
          playsInline
          preload="auto"
          onCanPlayThrough={视频可播放}
          data-ready={视频就绪 ? 'true' : 'false'}
          data-testid="kanagawa-video"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-white" style={{ opacity: 壁纸抬白浓度 }} />
    </div>
  )
}

export function XingKongXiXiBeiJing({ className, children }: 星空星系背景属性) {
  const 容器引用 = useRef<HTMLDivElement>(null)
  const [, 设置场景接口] = useState<星空星系场景接口 | null>(null)
  const [场景就绪, 设置场景就绪] = useState(false)
  const { 设置, 加载中 } = useXingNengDangWei()
  const 减少动画 = useJianShaoDongHua()
  const 是深色 = useShiFouAnSe()
  const 星空隐藏 = useXingKongKaiGuan((s) => s.星空隐藏)

  useEffect(() => {
    let 已取消 = false
    const 清理 = 当页面加载完毕且空闲(async () => {
      try {
        const { 创建星空控制面板 } = await import('./星空星系场景')
        if (!已取消) 创建星空控制面板()
      } catch {}
    })
    return () => {
      已取消 = true
      清理()
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || 减少动画 || !是深色 || 星空隐藏 || 加载中) return
    const 容器 = 容器引用.current
    if (!容器) return

    let 已取消 = false
    let 场景: 星空星系场景接口 | null = null
    const 清理 = 当页面加载完毕且空闲(async () => {
      try {
        const { 创建星空星系场景 } = await import('./星空星系场景')
        if (已取消) return
        const 像素比 = Array.isArray(设置.dpr) ? 设置.dpr[0] : 设置.dpr
        场景 = 创建星空星系场景(容器, { dpr: 像素比 })
        星空场景引用.current = 场景
        设置场景接口(场景)
        设置场景就绪(true)
      } catch {}
    })

    return () => {
      已取消 = true
      清理()
      场景?.destroy()
      星空场景引用.current = null
      设置场景接口(null)
      设置场景就绪(false)
    }
  }, [设置, 减少动画, 是深色, 星空隐藏, 加载中])

  const 显示画布 = 是深色 && !加载中 && !减少动画 && !星空隐藏 && 场景就绪

  const 显示壁纸 = !是深色 && !星空隐藏

  const 兜底类名 = 星空隐藏 ? (是深色 ? 'bg-black' : 'bg-white') : 是深色 ? 'bg-[#05060f]' : 'bg-transparent'

  return (
    <div
      ref={容器引用}
      className={合并类名('fixed inset-0 z-0', 显示画布 ? '' : 兜底类名, className)}
      aria-hidden="true"
      data-testid={显示画布 ? 'starry-background-canvas' : 'starry-background-fallback'}
    >
      {显示壁纸 && <QianSeBiZhi 减少动画={减少动画} />}
      {children}
    </div>
  )
}

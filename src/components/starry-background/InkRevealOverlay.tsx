import { useEffect, useRef } from 'react'
import { InkRevealRenderer } from './InkRevealRenderer'
import { useIsDarkMode } from './useIsDarkMode'
import { useStarryUiStore } from '../../store/useStarryUiStore'

interface InkRevealOverlayProps {
  enabled?: boolean
}

// 水墨遮罩双主题均为满不透明实色：深色=墨黑与星空底色一致（擦开见星）；
// 浅色=宣纸米色盖住壁纸（擦开见内容）
const 墨色深 = '#05060f'
const 墨色浅 = '#f2e9cf'

export function InkRevealOverlay({ enabled: enabledProp }: InkRevealOverlayProps) {
  const rendererRef = useRef<InkRevealRenderer | null>(null)
  const isDark = useIsDarkMode()
  const inkEnabled = useStarryUiStore((s) => s.inkEnabled)
  const enabled = enabledProp ?? inkEnabled

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(hover: hover)').matches) return

    // 主题切换时经依赖数组整体重建渲染器，覆盖色随主题换色并重涂遮罩
    const renderer = new InkRevealRenderer({
      enabled,
      coverColor: isDark ? 墨色深 : 墨色浅,
    })
    rendererRef.current = renderer
    renderer.mount(document.body)

    const onMove = (e: PointerEvent) => {
      renderer.onPointerMove(e.clientX, e.clientY)
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    return () => {
      window.removeEventListener('pointermove', onMove)
      renderer.unmount()
      rendererRef.current = null
    }
  }, [isDark, enabled])

  return null
}

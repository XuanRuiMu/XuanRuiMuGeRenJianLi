import { useEffect, useRef } from 'react'
import { InkRevealRenderer } from './InkRevealRenderer'
import { useIsDarkMode } from './useIsDarkMode'
import { useStarryUiStore } from '../../store/useStarryUiStore'

interface InkRevealOverlayProps {
  enabled?: boolean
}

export function InkRevealOverlay({ enabled: enabledProp }: InkRevealOverlayProps) {
  const rendererRef = useRef<InkRevealRenderer | null>(null)
  const isDark = useIsDarkMode()
  const inkEnabled = useStarryUiStore((s) => s.inkEnabled)
  const enabled = enabledProp ?? inkEnabled

  useEffect(() => {
    if (typeof window === 'undefined' || !isDark) return
    if (!window.matchMedia('(hover: hover)').matches) return

    const renderer = new InkRevealRenderer({ enabled })
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

import { useRef, useCallback, useEffect, type ReactNode, type MouseEvent } from 'react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface CardProps {
  children: ReactNode
  header?: ReactNode
  footer?: ReactNode
  glass?: boolean
  hover?: boolean
  tilt?: boolean
  className?: string
}

const TILT_PERSPECTIVE = 1000
const TILT_ROTATE_COEFFICIENT = 28
const TILT_SCALE = 1.03
const TILT_TRANSLATE_Z = 24
const MAGNETIC_STRENGTH = 8
const LERP_FACTOR = 0.12
const REST_THRESHOLD = 0.01

interface TransformState {
  rotateX: number
  rotateY: number
  scale: number
  translateX: number
  translateY: number
  translateZ: number
}

interface MousePosition {
  x: number
  y: number
}

const NEUTRAL_STATE: TransformState = {
  rotateX: 0,
  rotateY: 0,
  scale: 1,
  translateX: 0,
  translateY: 0,
  translateZ: 0,
}

const CENTER_MOUSE: MousePosition = { x: 0.5, y: 0.5 }

function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor
}

function isAtRest(current: TransformState, target: TransformState): boolean {
  return (
    Math.abs(current.rotateX - target.rotateX) < REST_THRESHOLD &&
    Math.abs(current.rotateY - target.rotateY) < REST_THRESHOLD &&
    Math.abs(current.scale - target.scale) < REST_THRESHOLD * 0.001 &&
    Math.abs(current.translateX - target.translateX) < REST_THRESHOLD &&
    Math.abs(current.translateY - target.translateY) < REST_THRESHOLD &&
    Math.abs(current.translateZ - target.translateZ) < REST_THRESHOLD
  )
}

function computeTargetFromMouse(mouse: MousePosition): TransformState {
  const normalizedX = mouse.x - 0.5
  const normalizedY = mouse.y - 0.5
  return {
    rotateX: -normalizedY * TILT_ROTATE_COEFFICIENT,
    rotateY: normalizedX * TILT_ROTATE_COEFFICIENT,
    scale: TILT_SCALE,
    translateX: normalizedX * MAGNETIC_STRENGTH,
    translateY: normalizedY * MAGNETIC_STRENGTH,
    translateZ: TILT_TRANSLATE_Z,
  }
}

export function Card({ children, header, footer, glass: _glass, hover = false, tilt = false, className }: CardProps) {
  const reducedMotion = useReducedMotion()
  const cardRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const isHoveringRef = useRef(false)
  const targetRef = useRef<TransformState>({ ...NEUTRAL_STATE })
  const currentRef = useRef<TransformState>({ ...NEUTRAL_STATE })
  const mouseRef = useRef<MousePosition>({ ...CENTER_MOUSE })
  const rectRef = useRef<DOMRect | null>(null)

  const tiltEnabled = tilt && !reducedMotion

  const resetGlow = useCallback((element: HTMLDivElement) => {
    element.style.setProperty('--tilt-glow-x', '50%')
    element.style.setProperty('--tilt-glow-y', '50%')
  }, [])

  const applyTransform = useCallback(() => {
    const element = cardRef.current
    if (!element) return
    const { rotateX, rotateY, scale, translateX, translateY, translateZ } = currentRef.current
    element.style.transform = `perspective(${TILT_PERSPECTIVE}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale}) translate3d(${translateX}px, ${translateY}px, ${translateZ}px)`
  }, [])

  const updateGlow = useCallback((element: HTMLDivElement, mouse: MousePosition) => {
    element.style.setProperty('--tilt-glow-x', `${mouse.x * 100}%`)
    element.style.setProperty('--tilt-glow-y', `${mouse.y * 100}%`)
  }, [])

  const tick = useCallback(() => {
    const element = cardRef.current
    if (!element) {
      rafRef.current = 0
      return
    }

    if (isHoveringRef.current) {
      targetRef.current = computeTargetFromMouse(mouseRef.current)
    } else {
      targetRef.current = { ...NEUTRAL_STATE }
    }

    const target = targetRef.current
    const current = currentRef.current

    current.rotateX = lerp(current.rotateX, target.rotateX, LERP_FACTOR)
    current.rotateY = lerp(current.rotateY, target.rotateY, LERP_FACTOR)
    current.scale = lerp(current.scale, target.scale, LERP_FACTOR)
    current.translateX = lerp(current.translateX, target.translateX, LERP_FACTOR)
    current.translateY = lerp(current.translateY, target.translateY, LERP_FACTOR)
    current.translateZ = lerp(current.translateZ, target.translateZ, LERP_FACTOR)

    applyTransform()

    if (isHoveringRef.current || !isAtRest(current, target)) {
      rafRef.current = requestAnimationFrame(tick)
    } else {
      rafRef.current = 0
    }
  }, [applyTransform])

  const startLoop = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [])

  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!tiltEnabled || !cardRef.current || !isHoveringRef.current) return
      const element = cardRef.current
      const rect = rectRef.current ?? element.getBoundingClientRect()
      const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
      const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
      mouseRef.current = { x, y }
      updateGlow(element, mouseRef.current)
      startLoop()
    },
    [tiltEnabled, startLoop, updateGlow]
  )

  const handleMouseEnter = useCallback(() => {
    if (!tiltEnabled) return
    isHoveringRef.current = true
    const element = cardRef.current
    if (!element) return
    rectRef.current = element.getBoundingClientRect()
    element.classList.add('is-tilt-active')
    mouseRef.current = { ...CENTER_MOUSE }
    updateGlow(element, mouseRef.current)
    startLoop()
  }, [tiltEnabled, startLoop, updateGlow])

  const handleMouseLeave = useCallback(() => {
    isHoveringRef.current = false
    mouseRef.current = { ...CENTER_MOUSE }
    rectRef.current = null
    const element = cardRef.current
    if (!element) return
    element.classList.remove('is-tilt-active')
    resetGlow(element)
    startLoop()
  }, [startLoop, resetGlow])

  useEffect(() => {
    return () => {
      stopLoop()
    }
  }, [stopLoop])

  useEffect(() => {
    if (tiltEnabled) return
    const element = cardRef.current
    if (!element) return
    element.style.transform = ''
    element.classList.remove('is-tilt-active')
    resetGlow(element)
    targetRef.current = { ...NEUTRAL_STATE }
    currentRef.current = { ...NEUTRAL_STATE }
    mouseRef.current = { ...CENTER_MOUSE }
    rectRef.current = null
    stopLoop()
  }, [tiltEnabled, resetGlow, stopLoop])

  return (
    <div
      ref={cardRef}
      onMouseMove={tiltEnabled ? handleMouseMove : undefined}
      onMouseEnter={tiltEnabled ? handleMouseEnter : undefined}
      onMouseLeave={tiltEnabled ? handleMouseLeave : undefined}
      style={{ '--tilt-glow-x': '50%', '--tilt-glow-y': '50%' } as React.CSSProperties}
      className={cn(
        'card-container relative overflow-hidden rounded-2xl border border-border bg-transparent p-6',
        hover && !tiltEnabled && 'transition-transform duration-300 hover:-translate-y-1',
        hover && tiltEnabled && 'hover:shadow-2xl',
        tiltEnabled && 'tilt-card will-change-transform',
        className
      )}
    >
      {tiltEnabled && (
        <>
          <div
            className="tilt-card-glow pointer-events-none absolute inset-0 z-10"
            style={{
              background:
                'radial-gradient(circle at var(--tilt-glow-x) var(--tilt-glow-y), rgba(255,255,255,0.16) 0%, transparent 55%)',
            }}
            aria-hidden="true"
          />
          <div
            className="tilt-card-border pointer-events-none absolute inset-0 z-0 rounded-2xl"
            style={{
              boxShadow: 'inset 0 0 0 1px rgba(0,217,255,0.25), 0 0 32px rgba(0,217,255,0.12)',
            }}
            aria-hidden="true"
          />
        </>
      )}
      {header && <div className="card-header mb-4">{header}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer mt-4 border-t border-border pt-4">{footer}</div>}
    </div>
  )
}

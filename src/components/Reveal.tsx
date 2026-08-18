import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../lib/utils'

interface RevealProps {
  children: ReactNode
  className?: string
  /** 进入视口后到开始动画的延迟（ms），用于错落节奏 */
  delay?: number
  id?: string
}

/**
 * 统一入场动画原语：基于 IntersectionObserver，进入视口时加 `reveal--visible`。
 * 减少动画偏好（prefers-reduced-motion 或 .reduced-motion）下在 index.css 中塌缩为静态（直接可见、无位移/过渡）。
 * 不支持 IntersectionObserver 的环境直接可见，保证内容永不隐藏。
 */
export function Reveal({ children, className, delay = 0, id }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      id={id}
      className={cn('reveal', visible && 'reveal--visible', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { 合并类名 } from '../库/工具'

interface 显现属性 {
  children: ReactNode
  className?: string

  延迟?: number
  id?: string
}

export function XianXian({ children, className, 延迟 = 0, id }: 显现属性) {
  const ref = useRef<HTMLDivElement>(null)
  const [可见, 设置可见] = useState(false)

  useEffect(() => {
    const 元素 = ref.current
    if (!元素) return

    if (typeof IntersectionObserver === 'undefined') {
      queueMicrotask(() => 设置可见(true))
      return
    }

    const 观察器 = new IntersectionObserver(
      (条目表) => {
        for (const 条目 of 条目表) {
          if (条目.isIntersecting) {
            设置可见(true)
            观察器.unobserve(条目.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    观察器.observe(元素)

    return () => 观察器.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      id={id}
      className={合并类名('reveal', 可见 && 'reveal--visible', className)}
      style={延迟 ? { transitionDelay: `${延迟}ms` } : undefined}
    >
      {children}
    </div>
  )
}

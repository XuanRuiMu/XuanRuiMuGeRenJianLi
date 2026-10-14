import type { ReactNode } from 'react'
import { 合并类名 } from '@/库/工具'

interface 标签组件属性 {
  children: ReactNode
  className?: string
}

export function BiaoQian({ children, className }: 标签组件属性) {
  return (
    <span
      className={合并类名(
        'inline-flex items-center rounded-md border border-border bg-surface-elevated/85 px-2 py-0.5 text-[10px] font-medium tracking-wide text-text-secondary backdrop-blur-sm',
        className
      )}
    >
      {children}
    </span>
  )
}

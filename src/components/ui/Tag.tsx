import type { ReactNode } from 'react'
import { 合并类名 } from '@/lib/工具'

interface TagProps {
  children: ReactNode
  className?: string
}

export function Tag({ children, className }: TagProps) {
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

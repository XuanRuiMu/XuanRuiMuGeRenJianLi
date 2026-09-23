import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  header?: ReactNode
  footer?: ReactNode
  glass?: boolean
  hover?: boolean
  className?: string
}

export function Card({ children, header, footer, glass: _glass, hover = false, className }: CardProps) {
  void _glass
  return (
    <div
      className={cn(
        'card-container relative rounded-2xl bg-transparent p-6',
        hover && 'transition-transform duration-300 hover:-translate-y-1',
        className
      )}
    >
      {header && <div className="card-header mb-4">{header}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer mt-4 pt-4">{footer}</div>}
    </div>
  )
}

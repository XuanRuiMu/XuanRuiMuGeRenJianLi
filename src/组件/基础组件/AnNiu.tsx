import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { 合并类名 } from '@/库/工具'

interface 按钮组件属性 extends ButtonHTMLAttributes<HTMLButtonElement> {
  变体?: 'primary' | 'secondary' | 'ghost'
  尺寸?: 'sm' | 'md' | 'lg'
  loading?: boolean
  图标?: ReactNode
}

export function AnNiu({
  变体 = 'primary',
  尺寸 = 'md',
  loading = false,
  图标,
  children,
  className,
  disabled,
  ...props
}: 按钮组件属性) {
  const 基础类名 =
    'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50'

  const 变体类名 = {
    primary: 'bg-primary text-bg hover:bg-primary/90',
    secondary: 'bg-secondary text-white hover:bg-secondary/90',
    ghost: 'bg-transparent text-text-primary hover:bg-white/10',
  }

  const 尺寸类名 = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-5 text-sm',
    lg: 'h-12 px-6 text-base',
  }

  return (
    <button
      className={合并类名(基础类名, 变体类名[变体], 尺寸类名[尺寸], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {!loading && 图标 && <span aria-hidden="true">{图标}</span>}
      {children}
    </button>
  )
}

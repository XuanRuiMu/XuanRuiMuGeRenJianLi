import type { ReactNode } from 'react'
import { 合并类名 } from '@/库/工具'

interface 卡片组件属性 {
  children: ReactNode
  头部?: ReactNode
  页脚?: ReactNode
  玻璃?: boolean
  悬停?: boolean
  className?: string
}

export function KaPian({ children, 头部, 页脚, 玻璃, 悬停 = false, className }: 卡片组件属性) {
  void 玻璃
  return (
    <div
      className={合并类名(
        'card-container relative rounded-2xl bg-transparent p-6',
        悬停 && 'transition-transform duration-300 hover:-translate-y-1',
        className
      )}
    >
      {头部 && <div className="card-header mb-4">{头部}</div>}
      <div className="card-body">{children}</div>
      {页脚 && <div className="card-footer mt-4 pt-4">{页脚}</div>}
    </div>
  )
}

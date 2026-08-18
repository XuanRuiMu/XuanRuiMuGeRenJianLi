import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Reveal } from '../Reveal'

interface SectionProps {
  id?: string
  title?: string
  subtitle?: string
  children: ReactNode
  className?: string
}

export function Section({ id, title, subtitle, children, className }: SectionProps) {
  return (
    <section id={id} className={cn('relative py-16 md:py-24 px-4 sm:px-6 lg:px-8', className)}>
      <div className="relative mx-auto max-w-6xl">
        {(title || subtitle) && (
          <Reveal className="mb-10 md:mb-14">
            {title && (
              <h2 className="mb-3 text-3xl font-medium tracking-tight text-text-primary text-shadow-readable md:text-4xl">
                {title}
              </h2>
            )}
            {subtitle && <p className="max-w-2xl text-lg text-text-secondary text-shadow-readable">{subtitle}</p>}
          </Reveal>
        )}
        {children}
      </div>
    </section>
  )
}

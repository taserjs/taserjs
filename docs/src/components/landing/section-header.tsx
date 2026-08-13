import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface SectionHeaderProps {
  eyebrow?: string
  title: ReactNode
  description?: string
  align?: 'left' | 'center'
  className?: string
  animated?: boolean
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
  animated = true,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        className,
      )}
    >
      {eyebrow
        ? (
            <p
              className={cn(
                'mb-3 text-sm font-medium tracking-wide text-fd-primary uppercase',
                animated && 'landing-animate-in',
              )}
            >
              {eyebrow}
            </p>
          )
        : null}
      <h2
        className={cn(
          'text-2xl font-semibold tracking-tight md:text-3xl',
          animated && 'landing-animate-in',
          animated && !eyebrow && 'landing-delay-1',
        )}
      >
        {title}
      </h2>
      {description
        ? (
            <p
              className={cn(
                'mt-3 text-fd-muted-foreground',
                animated && 'landing-animate-in landing-delay-1',
                animated && eyebrow && 'landing-delay-2',
              )}
            >
              {description}
            </p>
          )
        : null}
    </div>
  )
}

export function SectionAccent({ children }: { children: ReactNode }) {
  return <span className="landing-text-gradient-warm">{children}</span>
}

import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { SectionAccent, SectionHeader } from './section-header'
import { SectionSeparator } from './section-separator'

interface PageHeroProps {
  eyebrow: string
  title: ReactNode
  description: string
  actions?: ReactNode
}

export function PageHero({ eyebrow, title, description, actions }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div
        className="landing-hero-glow-warm pointer-events-none absolute inset-0"
        aria-hidden
      />
      <SectionSeparator />
      <div className="relative mx-auto max-w-(--fd-layout-width) px-6 py-16 md:py-24">
        <SectionHeader
          align="center"
          className="mx-auto"
          eyebrow={eyebrow}
          title={title}
          description={description}
        />
        {actions
          ? (
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                {actions}
              </div>
            )
          : null}
      </div>
    </section>
  )
}

interface PageSectionProps {
  title: ReactNode
  description?: string
  children: ReactNode
  muted?: boolean
  className?: string
}

export function PageSection({
  title,
  description,
  children,
  muted = false,
  className,
}: PageSectionProps) {
  return (
    <section className={muted ? 'relative bg-fd-muted/25' : 'relative'}>
      <SectionSeparator />
      <div className={cn('mx-auto max-w-(--fd-layout-width) px-6 py-16 md:py-24', className)}>
        <SectionHeader
          className="mb-10"
          animated={false}
          title={title}
          description={description}
        />
        {children}
      </div>
    </section>
  )
}

export { SectionAccent }

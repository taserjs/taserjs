import { ArrowRight } from 'lucide-react'

import { SectionAccent, SectionHeader } from './section-header'
import { SectionSeparator } from './section-separator'
import Link from 'next/link'

export function CtaSection() {
  return (
    <section className="relative bg-fd-muted/30">
      <SectionSeparator />
      <div className="mx-auto max-w-(--fd-layout-width) px-6 py-16 text-center md:py-20">
        <SectionHeader
          align="center"
          className="mx-auto"
          title={(
            <>
              Ready to try it on a
              {' '}
              <SectionAccent>real route</SectionAccent>
              ?
            </>
          )}
          description="Start with the docs, pick an adapter, and ship a handler that is type-checked before the first request hits it."
        />
        <Link
          href="/docs"
          className="landing-animate-in landing-delay-2 mt-8 inline-flex items-center gap-2 rounded-xl bg-fd-primary px-5 py-3 text-sm font-medium text-fd-primary-foreground shadow-sm transition-all duration-300 hover:opacity-90 hover:shadow-md hover:-translate-y-0.5"
        >
          Open documentation
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  )
}

import { ArrowRight, BookOpen, Sparkles } from 'lucide-react'

import { HeroVisual } from './hero-visual'
import { Logo } from '@/components/logo'
import { SectionSeparator } from './section-separator'
import Link from 'next/link'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="landing-hero-glow-warm pointer-events-none absolute inset-0"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_10%,var(--color-fd-primary),transparent)] opacity-[0.08]"
        aria-hidden
      />

      <div className="relative mx-auto grid min-w-0 max-w-(--fd-layout-width) gap-12 px-6 py-16 md:py-24 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-28">
        <div className="min-w-0">
          <p className="landing-animate-in mb-4 flex w-fit items-center gap-1.5 rounded-full border border-fd-border bg-fd-background/70 px-3 py-1.5 text-xs font-medium tracking-wide text-fd-muted-foreground uppercase backdrop-blur-sm">
            <Sparkles className="size-3.5 text-violet-500 dark:text-violet-400" aria-hidden />
            Type-safe routing for APIs
          </p>
          <Logo className="w-56 shrink-0" />
          <h1 className="landing-animate-in landing-delay-1 max-w-xl text-4xl font-semibold tracking-tight text-balance md:text-5xl lg:leading-[1.1]">
            Define schemas once.
            <br />
            <span className="landing-text-gradient-cool">Let types flow everywhere.</span>
          </h1>
          <p className="landing-animate-in landing-delay-2 mt-5 max-w-lg text-lg text-fd-muted-foreground text-pretty">
            File-based routing for Node.js APIs. Compose layouts and middleware with full
            inference, validate every input, and skip the type assertions after middleware
            already did the work.
          </p>
          <div className="landing-animate-in landing-delay-3 mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-xl bg-fd-primary px-4 py-2.5 text-sm font-medium text-fd-primary-foreground shadow-sm transition-all duration-300 hover:opacity-90 hover:shadow-md"
            >
              Getting Started
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-xl border border-fd-border bg-fd-background/80 px-4 py-2.5 text-sm font-medium backdrop-blur-sm transition-all duration-300 hover:bg-fd-accent hover:-translate-y-0.5"
            >
              <BookOpen className="size-4 text-fd-muted-foreground" aria-hidden />
              Documentation
            </Link>
          </div>
        </div>

        <HeroVisual />
      </div>
      <SectionSeparator position="bottom" />
    </section>
  )
}

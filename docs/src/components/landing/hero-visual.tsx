import type { HeroHighlightedTabs } from '@/lib/hero-code-data'
import { HeroCode } from './hero-code'

interface HeroVisualProps {
  highlightedTabs: HeroHighlightedTabs
}

export function HeroVisual({ highlightedTabs }: HeroVisualProps) {
  return (
    <div className="relative landing-animate-in landing-delay-3">
      <img
        src="/hero-glow.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -inset-12 landing-glow opacity-80 dark:opacity-100"
      />
      <div className="landing-float relative">
        <HeroCode highlightedTabs={highlightedTabs} />
        <div className="absolute -right-3 -bottom-3 rounded-lg border border-fd-border bg-fd-background px-3 py-1.5 text-xs font-medium shadow-md md:-right-4 md:-bottom-4">
          <span className="landing-text-gradient-cool">E2E Type Safe</span>
        </div>
      </div>
    </div>
  )
}

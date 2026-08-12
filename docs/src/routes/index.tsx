import { createFileRoute } from '@tanstack/react-router'
import { HomeLayout } from 'fumadocs-ui/layouts/home'

import { AdaptersSection } from '@/components/landing/adapters-section'
import { CtaSection } from '@/components/landing/cta-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { HeroSection } from '@/components/landing/hero-section'
import { SponsorsSection } from '@/components/landing/sponsors-section'
import { TestimonialsSection } from '@/components/landing/testimonials-section'
import { TryItSection } from '@/components/landing/try-it-section'
import { baseOptions } from '@/lib/layout.shared'
import { loadHeroHighlightedTabs } from '@/lib/hero-code-data'
import { getSiteOgImageUrl, openGraphMeta, sitePages } from '@/lib/og-meta'

export const Route = createFileRoute('/')({
  component: Home,
  loader: () => loadHeroHighlightedTabs(),
  head: () => ({
    meta: openGraphMeta({
      ...sitePages.home,
      image: getSiteOgImageUrl('home'),
    }),
  }),
})

function Home() {
  const highlightedTabs = Route.useLoaderData()

  return (
    <HomeLayout {...baseOptions()}>
      <HeroSection highlightedTabs={highlightedTabs} />
      <TryItSection />
      <FeaturesSection />
      <TestimonialsSection />
      <AdaptersSection />
      <SponsorsSection />
      <CtaSection />
    </HomeLayout>
  )
}

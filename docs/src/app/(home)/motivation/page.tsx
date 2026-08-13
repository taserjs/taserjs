import {
  AlertTriangle,
  Braces,
  Copy,
  Layers,
  Lightbulb,
  Route as RouteIcon,
  ShieldCheck,
  Waypoints,
} from 'lucide-react'

import { CtaSection } from '@/components/landing/cta-section'
import { FeatureCard } from '@/components/landing/feature-card'
import { CalloutCard, CheckList, InfoCard } from '@/components/landing/info-card'
import { PageHero, PageSection, SectionAccent } from '@/components/landing/page-section'
import { SponsorsSection } from '@/components/landing/sponsors-section'
import Link from 'next/link'
import { motivationMetadata } from '@/lib/metadata'

export const metadata = motivationMetadata

const primaryButtonClass
  = 'inline-flex items-center justify-center rounded-xl bg-fd-primary px-5 py-3 text-sm font-medium text-fd-primary-foreground shadow-sm transition-all duration-300 hover:opacity-90 hover:shadow-md hover:-translate-y-0.5'

const secondaryButtonClass
  = 'inline-flex items-center justify-center rounded-xl border border-fd-border bg-fd-background px-5 py-3 text-sm font-medium transition-colors hover:bg-fd-accent'

export default function MotivationPage() {
  return (
    <>
      <PageHero
        eyebrow="Motivation"
        title={(
          <>
            Why
            <SectionAccent>Taser</SectionAccent>
            {' '}
            exists
          </>
        )}
        description="Taser is inspired by the clarity of file based routing and the ergonomics of TanStack Router. It is built for APIs that grow past the demo stage."
        actions={(
          <>
            <Link
              href="/docs"
              className={primaryButtonClass}
            >
              Start with the docs
            </Link>
            <Link href="/sponsor" className={secondaryButtonClass}>
              Sponsor the project
            </Link>
          </>
        )}
      />

      <PageSection
        muted
        title={(
          <>
            Inspired by
            <SectionAccent>TanStack Router</SectionAccent>
          </>
        )}
        description="Framework examples are often clean and minimal. That clarity is a great starting point."
      >
        <CalloutCard icon={<Lightbulb aria-hidden />}>
          TanStack Router showed how good route ergonomics can feel: file based routes, strong types, and a workflow
          that stays out of your way. Taser takes that inspiration to backend APIs, where composition and validation
          are not optional extras. They are the product.
        </CalloutCard>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <InfoCard icon={<RouteIcon aria-hidden />} iconTone="violet" title="File based routes">
            <p className="text-sm text-fd-muted-foreground">
              Routes live in files. The manifest stays in sync as your API grows.
            </p>
          </InfoCard>
          <InfoCard icon={<Braces aria-hidden />} iconTone="sky" title="Types that travel">
            <p className="text-sm text-fd-muted-foreground">
              Query, params, body, and returns stay connected through middleware chains.
            </p>
          </InfoCard>
          <InfoCard icon={<Waypoints aria-hidden />} iconTone="emerald" title="A client that matches">
            <p className="text-sm text-fd-muted-foreground">
              Call your API with the same types your handlers use. Fewer surprises in production.
            </p>
          </InfoCard>
        </div>
      </PageSection>

      <PageSection
        title={(
          <>
            The problem: APIs need
            <SectionAccent>composition</SectionAccent>
          </>
        )}
        description="Real APIs need shared behavior that stays consistent across hundreds of routes."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <InfoCard icon={<AlertTriangle aria-hidden />} iconTone="amber" title="What gets hard">
            <CheckList
              items={[
                'Auth and role checks spread across files',
                'Shared context that becomes loosely typed over time',
                'Validation that is duplicated or skipped in some routes',
                'Return shapes that drift and surprise clients',
                'Error handling that is inconsistent across the API',
              ]}
            />
          </InfoCard>
          <InfoCard icon={<Copy aria-hidden />} iconTone="rose" title="What teams end up doing">
            <CheckList
              items={[
                'Manual route registries that fall out of date',
                'Copy and paste middleware that no one wants to touch',
                'Types that exist, but do not match runtime behavior',
                'Ad hoc clients and handwritten response typing',
                'Big refactors when the first real product needs arrive',
              ]}
            />
          </InfoCard>
        </div>
      </PageSection>

      <PageSection
        muted
        title={(
          <>
            The idea: make composition
            <SectionAccent>type safe</SectionAccent>
          </>
        )}
        description="Taser keeps file based ergonomics while giving teams tools to scale composition without losing correctness."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Layers />}
            iconTone="indigo"
            title="Layouts and middleware"
            description="Compose shared behavior at the directory level. Types flow through the chain so each handler sees what middleware created."
          />
          <FeatureCard
            icon={<ShieldCheck />}
            iconTone="emerald"
            title="Runtime validation"
            description="Inputs and outputs are validated with Standard Schema compatible libraries, so types reflect real runtime checks."
          />
          <FeatureCard
            icon={<Waypoints />}
            iconTone="sky"
            title="Typed client"
            description="Export your router types and call your API with a client that matches what handlers return."
          />
        </div>

        <CalloutCard className="mt-8">
          Taser is our attempt to bring TanStack Router style ergonomics to backend APIs, where the hard part is not
          defining a single route. It is keeping hundreds of routes consistent as the product evolves.
        </CalloutCard>
      </PageSection>

      <SponsorsSection />
      <CtaSection />
    </>
  )
}

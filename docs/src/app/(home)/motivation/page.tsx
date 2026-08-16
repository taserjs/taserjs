import {
  AlertCircle,
  AlertTriangle,
  Braces,
  Copy,
  FileBraces,
  Layers,
  Route as RouteIcon,
  ShieldCheck,
  Waypoints,
  XCircle,
} from "lucide-react";

import { CtaSection } from "@/components/landing/cta-section";
import { FeatureCard } from "@/components/landing/feature-card";
import { CalloutCard, CheckList, InfoCard } from "@/components/landing/info-card";
import { PageHero, PageSection, SectionAccent } from "@/components/landing/page-section";
import { RouterComparison } from "@/components/landing/router-comparison";
import { SponsorsSection } from "@/components/landing/sponsors-section";
import Link from "next/link";
import { motivationMetadata } from "@/lib/metadata";

export const metadata = motivationMetadata;

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-xl bg-fd-primary px-5 py-3 text-sm font-medium text-fd-primary-foreground shadow-sm transition-all duration-300 hover:opacity-90 hover:shadow-md hover:-translate-y-0.5";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-fd-border bg-fd-background px-5 py-3 text-sm font-medium transition-colors hover:bg-fd-accent";

export default function MotivationPage() {
  return (
    <>
      <PageHero
        eyebrow="Motivation"
        title={
          <>
            Why
            <SectionAccent>Taser</SectionAccent> exists
          </>
        }
        description="Taser is inspired by the simplicity of file-based routing and the ergonomics of TanStack Router. It is built for APIs that grow beyond traditional CRUD endpoints."
        actions={
          <>
            <Link href="/docs" className={primaryButtonClass}>
              Start with the docs
            </Link>
            <Link href="/sponsor" className={secondaryButtonClass}>
              Sponsor the project
            </Link>
          </>
        }
      />

      {/* Side-by-side Showcase Section */}
      <PageSection
        muted
        title={
          <>
            Inspired by <SectionAccent>TanStack Router</SectionAccent>
          </>
        }
        description="TanStack Router proved how good route ergonomics can feel on the frontend. Taser brings that exact intuition, directory cascading, and type-safety to backend REST APIs."
      >
        <RouterComparison />
      </PageSection>

      {/* Tailored to REST APIs Section */}
      <PageSection
        title={
          <>
            Built specifically for <SectionAccent>REST APIs</SectionAccent>
          </>
        }
        description="Every aspect of Taser is engineered to eliminate runtime drift and manual registration in backend services."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard icon={<RouteIcon aria-hidden />} iconTone="violet" title="File-based routes">
            <p className="text-sm text-fd-muted-foreground">
              Routes live in files matching HTTP verbs. The manifest stays automatically in sync as
              your API expands.
            </p>
          </InfoCard>
          <InfoCard icon={<Braces aria-hidden />} iconTone="sky" title="Types that travel">
            <p className="text-sm text-fd-muted-foreground">
              Context, query, params, and body types flow naturally down directory-level middleware
              chains.
            </p>
          </InfoCard>
          <InfoCard icon={<Waypoints aria-hidden />} iconTone="emerald" title="Framework agnostic">
            <p className="text-sm text-fd-muted-foreground">
              Mount the router with Express, Hono, Fastify, or Node HTTP without rewriting your
              domain logic.
            </p>
          </InfoCard>
          <InfoCard icon={<FileBraces aria-hidden />} iconTone="amber" title="Standard Schema">
            <p className="text-sm text-fd-muted-foreground">
              Validate inputs and responses with any Standard Schema library: Zod, ArkType, Valibot,
              and more.
            </p>
          </InfoCard>
        </div>
      </PageSection>

      {/* The Problem Section */}
      <PageSection
        muted
        title={
          <>
            The problem: APIs need <SectionAccent>composition</SectionAccent>
          </>
        }
        description="Real APIs need shared behavior that stays consistent across hundreds of routes without copy-paste drift."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <InfoCard icon={<AlertTriangle aria-hidden />} iconTone="amber" title="What gets hard">
            <CheckList
              icon={
                <AlertCircle
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                />
              }
              items={[
                "Auth and role checks spread inconsistently across endpoints",
                "Shared request context becoming loosely typed or any-cast over time",
                "Validation duplicated or inadvertently skipped on edge routes",
                "Response shapes that drift and surprise downstream frontend clients",
                "Inconsistent error handling and status code conventions across the API",
              ]}
            />
          </InfoCard>
          <InfoCard icon={<Copy aria-hidden />} iconTone="rose" title="What teams end up doing">
            <CheckList
              icon={
                <XCircle
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400"
                />
              }
              items={[
                "Manual route registration files that constantly fall out of date",
                "Fragile copy-and-paste middleware that developers fear touching",
                "TypeScript types that exist on paper, but do not match runtime behavior",
                "Ad hoc fetch wrappers and handwritten response type definitions",
                "Massive breaking refactors whenever real enterprise requirements emerge",
              ]}
            />
          </InfoCard>
        </div>
      </PageSection>

      {/* The Idea Section */}
      <PageSection
        title={
          <>
            The solution: make composition
            <SectionAccent>type safe</SectionAccent>
          </>
        }
        description="Taser keeps file-based ergonomics while giving teams tools to scale composition without losing correctness."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Layers />}
            iconTone="indigo"
            title="Layouts & directory middleware"
            description="Compose shared auth, logging, and headers at the folder level. Types flow down the chain so handlers safely receive exactly what middleware provides."
          />
          <FeatureCard
            icon={<ShieldCheck />}
            iconTone="emerald"
            title="Runtime schema validation"
            description="Query, params, headers, and body payloads are validated with Standard Schema libraries, guaranteeing that TypeScript types match real payload checks."
          />
          <FeatureCard
            icon={<Waypoints />}
            iconTone="sky"
            title="End-to-end typed client"
            description="Export your router's type definition and call your endpoints with an auto-generated client that knows exact route paths, methods, inputs, and returns."
          />
        </div>

        <CalloutCard className="mt-8">
          Taser brings TanStack Router&apos;s ergonomic revolution to the backend—where the true
          challenge isn&apos;t defining a single endpoint, but maintaining type safety and
          composability across hundreds of routes as your application evolves.
        </CalloutCard>
      </PageSection>

      <SponsorsSection />
      <CtaSection />
    </>
  );
}

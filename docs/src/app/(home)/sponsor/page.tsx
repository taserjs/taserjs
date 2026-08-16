import { BookOpen, Heart, ShieldCheck, Sparkles, Wrench } from "lucide-react";

import { CtaSection } from "@/components/landing/cta-section";
import { CalloutCard, CheckList, InfoCard } from "@/components/landing/info-card";
import { PageHero, PageSection, SectionAccent } from "@/components/landing/page-section";
import { SponsorsSection } from "@/components/landing/sponsors-section";
import { sponsorUrl } from "@/lib/shared";
import Link from "next/link";
import { sponsorMetadata } from "@/lib/metadata";

export const metadata = sponsorMetadata;

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-fd-primary px-5 py-3 text-sm font-medium text-fd-primary-foreground shadow-sm transition-all duration-300 hover:opacity-90 hover:shadow-md hover:-translate-y-0.5";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-fd-border bg-fd-background px-5 py-3 text-sm font-medium transition-colors hover:bg-fd-accent";

export default function SponsorPage() {
  return (
    <>
      <PageHero
        eyebrow="Sponsorship"
        title={
          <>
            Sponsor
            <SectionAccent>Taser</SectionAccent>
          </>
        }
        description="If Taser saves you time, makes your APIs safer, or reduces churn in reviews, sponsoring is the best way to keep the project moving."
        actions={
          <>
            <a href={sponsorUrl} className={primaryButtonClass}>
              <Sparkles className="size-4" aria-hidden />
              Become a sponsor
            </a>
            <Link href="/motivation" className={secondaryButtonClass}>
              Read the motivation
            </Link>
          </>
        }
      />

      <PageSection
        title={
          <>
            A note from the
            <SectionAccent>maintainers</SectionAccent>
          </>
        }
        description="Taser is open source because we want teams to build better APIs without fighting their router."
      >
        <CalloutCard icon={<Heart aria-hidden />}>
          We started Taser after seeing the same pattern repeat: demos look great, but real APIs
          need composition, validation, and shared context. Sponsorship helps us keep improving the
          core router, adapters, codegen, and typed client so you can focus on product work instead
          of plumbing.
        </CalloutCard>
      </PageSection>

      <PageSection
        muted
        title={
          <>
            What your sponsorship
            <SectionAccent>supports</SectionAccent>
          </>
        }
        description="This is where sponsor funds go. The goal is simple: keep Taser dependable and easy to adopt."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoCard
            icon={<ShieldCheck aria-hidden />}
            iconTone="emerald"
            title="Quality and stability"
          >
            <CheckList
              items={[
                "Bug fixes that unblock real apps",
                "Adapter parity across Express, Hono, Fastify, and Node",
                "Better errors and safer edge cases",
              ]}
            />
          </InfoCard>
          <InfoCard icon={<BookOpen aria-hidden />} iconTone="sky" title="Docs and examples">
            <CheckList
              items={[
                "Clear guides that match how teams actually build APIs",
                "Composition patterns for auth, layouts, and shared context",
                "Better starter templates and upgrade notes",
              ]}
            />
          </InfoCard>
          <InfoCard icon={<Wrench aria-hidden />} iconTone="amber" title="Tooling and DX">
            <CheckList
              items={[
                "Codegen improvements and watch mode reliability",
                "Typed client ergonomics and better inference",
                "Faster onboarding for new contributors",
              ]}
            />
          </InfoCard>
          <InfoCard icon={<Sparkles aria-hidden />} iconTone="orange" title="Community and roadmap">
            <CheckList
              items={[
                "Time to review issues and pull requests",
                "Sponsor input on roadmap priorities",
                "Long term maintenance without burning out maintainers",
              ]}
            />
          </InfoCard>
        </div>

        <CalloutCard className="mt-8">
          If you want a specific feature, integration, or migration help, include it in the sponsor
          note or email us. We read every message.
        </CalloutCard>
      </PageSection>

      <SponsorsSection />
      <CtaSection />
    </>
  );
}

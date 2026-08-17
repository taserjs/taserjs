"use client";

import { motion } from "framer-motion";
import { Heart, Sparkles } from "lucide-react";

import { sponsorUrl } from "@/lib/shared";
import { cn } from "@/lib/cn";
import { SectionAccent, SectionHeader } from "./section-header";
import { SectionSeparator } from "./section-separator";

type SponsorTier = {
  id: string;
  name: string;
  benefit: string;
  slots: number;
  slotClassName: string;
  gridClassName: string;
};

const sponsorTiers: SponsorTier[] = [
  {
    id: "enterprise",
    name: "Enterprise",
    benefit: "Logo placement, priority support, and roadmap input.",
    slots: 2,
    slotClassName: "h-28 md:h-32",
    gridClassName: "grid-cols-1 sm:grid-cols-2",
  },
  {
    id: "platinum",
    name: "Platinum",
    benefit: "Prominent logo on the homepage and release notes.",
    slots: 3,
    slotClassName: "h-24",
    gridClassName: "grid-cols-2 sm:grid-cols-3",
  },
  {
    id: "gold",
    name: "Gold",
    benefit: "Logo on the sponsors wall and docs footer.",
    slots: 4,
    slotClassName: "h-20",
    gridClassName: "grid-cols-3 sm:grid-cols-4",
  },
  {
    id: "silver",
    name: "Silver",
    benefit: "Name and logo in the sponsors section.",
    slots: 5,
    slotClassName: "h-16",
    gridClassName: "grid-cols-4 sm:grid-cols-5",
  },
];

function SponsorPlaceholder({ className }: { className: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl border border-dashed border-fd-border bg-fd-muted/30 text-xs font-medium text-fd-muted-foreground transition-colors hover:border-fd-primary/30 hover:text-fd-foreground",
        className,
      )}
    >
      Your logo here
    </div>
  );
}

export function SponsorsSection() {
  return (
    <section id="sponsors" className="relative scroll-mt-14">
      <SectionSeparator />
      <div className="mx-auto max-w-(--fd-layout-width) px-6 py-16 md:py-24">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <SectionHeader
            align="center"
            animated={false}
            eyebrow="Open Source & Independent"
            title={
              <span>
                Backed by the community. <SectionAccent>Built for everyone</SectionAccent>.
              </span>
            }
            description="Taser is 100% open source. Sponsoring funds continuous performance optimizations, runtime adapter parity, codegen tooling, and long-term maintenance."
          />
        </motion.div>

        <motion.div
          className="mt-12 flex flex-col gap-10 hidden"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          {sponsorTiers.map((tier) => (
            <div key={tier.id}>
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="text-sm font-semibold tracking-wide text-fd-primary uppercase">
                  {tier.name}
                </h3>
                <p className="text-xs text-fd-muted-foreground">{tier.benefit}</p>
              </div>
              <div className={cn("grid gap-3", tier.gridClassName)}>
                {Array.from({ length: tier.slots }, (_, index) => (
                  <SponsorPlaceholder key={`${tier.id}-${index}`} className={tier.slotClassName} />
                ))}
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div
          className="relative mt-12 overflow-hidden rounded-2xl border border-fd-border bg-fd-card p-8 shadow-sm md:p-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.12 }}
        >
          <SectionSeparator />
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <div className="mb-3 flex size-10 items-center justify-center rounded-lg border border-fd-border bg-fd-muted text-landing-accent">
                <Heart className="size-5" aria-hidden />
              </div>
              <h3 className="text-xl font-semibold tracking-tight">Sponsor Taser Development</h3>
              <p className="mt-2 text-sm text-fd-muted-foreground">
                Support sustainable open source tooling. Contributions directly support new runtime
                adapters (Express, Hono, Fastify), instant watch-mode codegen improvements, and
                first-class Standard Schema integrations.
              </p>
            </div>
            <div className="flex shrink-0 items-center">
              <a
                href={sponsorUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-fd-primary px-6 py-3.5 text-sm font-medium text-fd-primary-foreground shadow-sm transition-all duration-300 hover:opacity-90 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
              >
                <Sparkles className="size-4" aria-hidden />
                Sponsor on GitHub
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

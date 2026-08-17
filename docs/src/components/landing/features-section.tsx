import type { ReactNode } from "react";
import { Braces, FileCode2, Layers, Plug, Sparkles, Waypoints } from "lucide-react";

import { FeatureCard } from "./feature-card";
import type { IconTone } from "./feature-card";
import { SectionAccent, SectionHeader } from "./section-header";
import { SectionSeparator } from "./section-separator";

const features: { icon: ReactNode; title: string; description: string; iconTone: IconTone }[] = [
  {
    icon: <FileCode2 />,
    title: "File-Based Routes",
    description:
      "Drop route files and let Taser generate the route tree and infer context automatically.",
    iconTone: "violet",
  },
  {
    icon: <Braces />,
    title: "Types that Follow the Wire",
    description:
      "Query, params, body, and returns inferred end-to-end through your middleware chain.",
    iconTone: "sky",
  },
  {
    icon: <Plug />,
    title: "Framework Agnostic",
    description: "Mount on Express, Hono, Fastify, or plain Node with a single router definition.",
    iconTone: "orange",
  },
  {
    icon: <Layers />,
    title: "Validate with Standard Schema",
    description:
      "Validate with any Standard Schema library of your choice: Zod, ArkType, Valibot, and more.",
    iconTone: "indigo",
  },
  {
    icon: <Sparkles />,
    title: "Codegen on Watch",
    description: "The CLI regenerates manifests as you edit your routes. Zero manual route tables.",
    iconTone: "rose",
  },
  {
    icon: <Waypoints />,
    title: "Optional Typed Client",
    description: "Export TaserAppRouter and call your API with the exact types from your handlers.",
    iconTone: "emerald",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative bg-fd-muted/20 scroll-mt-14">
      <SectionSeparator />
      <div className="mx-auto max-w-(--fd-layout-width) px-6 py-16 md:py-24">
        <SectionHeader
          align="center"
          className="mb-10"
          eyebrow="Features"
          title={
            <>
              Built for teams who hate <SectionAccent>manual type casting</SectionAccent>
            </>
          }
          description="Taser types the full request lifecycle and provides end-to-end server-side type safety that developers and agents love."
        />

        <div className="landing-animate-in landing-delay-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              iconTone={feature.iconTone}
              href="/docs"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

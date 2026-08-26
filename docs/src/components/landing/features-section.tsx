import type { ReactNode } from "react";
import { Braces, FileCode2, Layers, Plug, Sparkles, Waypoints } from "lucide-react";

import { FeatureCard } from "./feature-card";
import type { IconTone } from "./feature-card";
import { SectionAccent, SectionHeader } from "./section-header";
import { SectionSeparator } from "./section-separator";

const features: { icon: ReactNode; title: string; description: string; iconTone: IconTone }[] = [
  {
    icon: <FileCode2 />,
    title: "File-Based Routing",
    description:
      "Drop .get.ts and .post.ts files to create typed endpoints automatically with zero manual route tables.",
    iconTone: "violet",
  },
  {
    icon: <Braces />,
    title: "Cascading Context",
    description:
      "Middleware state flows through directory layouts directly into ctx.state with zero type assertions.",
    iconTone: "sky",
  },
  {
    icon: <Plug />,
    title: "Framework Agnostic",
    description:
      "Mount on Express, Hono, Fastify, or plain Node with a single portable router definition.",
    iconTone: "orange",
  },
  {
    icon: <Layers />,
    title: "Standard Schema",
    description:
      "Validate query, params, headers, and body with Zod, ArkType, Valibot, or any Standard Schema validator.",
    iconTone: "indigo",
  },
  {
    icon: <Sparkles />,
    title: "Vite HMR & Virtual Modules",
    description:
      "Vite plugin compiles file routes virtually with instant HMR and automatic ambient TypeScript types.",
    iconTone: "rose",
  },
  {
    icon: <Waypoints />,
    title: "Zero-Drift Typed Client",
    description:
      "Export router types and call endpoints with an auto-generated client that knows exact response shapes.",
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
              Built for teams that refuse to{" "}
              <SectionAccent>compromise on type safety</SectionAccent>
            </>
          }
          description="Taser types the full request lifecycle from file route discovery down to typed client generation."
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

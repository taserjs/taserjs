import type { ReactNode } from "react";
import {
  Box,
  Braces,
  Globe,
  Hexagon,
  MoreHorizontal,
  Server,
  ShieldCheck,
  Workflow,
  Zap,
} from "lucide-react";

import { FeatureCard } from "./feature-card";
import type { IconTone } from "./feature-card";
import { SectionAccent, SectionHeader } from "./section-header";
import { SectionSeparator } from "./section-separator";

const adapters: { name: string; description: string; icon: ReactNode; iconTone: IconTone }[] = [
  {
    name: "Express",
    description: "Mount seamlessly with Express splat routing.",
    icon: <Server />,
    iconTone: "sky",
  },
  {
    name: "Hono",
    description: "High-performance and edge-ready.",
    icon: <Zap />,
    iconTone: "amber",
  },
  {
    name: "Fastify",
    description: "High-throughput Node servers.",
    icon: <Workflow />,
    iconTone: "cyan",
  },
  {
    name: "Node",
    description: "Standard Node.js HTTP server handler.",
    icon: <Box />,
    iconTone: "violet",
  },
  {
    name: "Fetch",
    description: "Web-standard Request / Response adapter.",
    icon: <Globe />,
    iconTone: "emerald",
  },
];

const schemaLibraries: {
  name: string;
  description: string;
  icon: ReactNode;
  iconTone: IconTone;
}[] = [
  {
    name: "Zod",
    description: "TypeScript-first schemas with rich inference.",
    icon: <Braces />,
    iconTone: "indigo",
  },
  {
    name: "ArkType",
    description: "TypeScript-native validation with deep inference.",
    icon: <Hexagon />,
    iconTone: "violet",
  },
  {
    name: "Valibot",
    description: "Modular, tree-shakeable schema definitions.",
    icon: <ShieldCheck />,
    iconTone: "emerald",
  },
  {
    name: "And more",
    description: "Any library implementing the Standard Schema spec.",
    icon: <MoreHorizontal />,
    iconTone: "rose",
  },
];

export function AdaptersSection() {
  return (
    <section id="adapters" className="relative scroll-mt-14">
      <SectionSeparator />
      <div className="mx-auto max-w-(--fd-layout-width) px-6 py-16 md:py-24">
        <SectionHeader
          align="center"
          className="mb-10"
          eyebrow="Adapters"
          title={
            <>
              Framework Agnostic. <SectionAccent>Runtime Universal</SectionAccent>.
            </>
          }
          description="Write your business logic once with Taser. Mount on Express, Hono, Fastify, or plain Node.js without rewriting a single handler."
        />

        <div className="landing-animate-in landing-delay-2 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {adapters.map((adapter) => (
            <FeatureCard
              key={adapter.name}
              icon={adapter.icon}
              title={adapter.name}
              description={adapter.description}
              iconTone={adapter.iconTone}
              href="/docs"
            />
          ))}
        </div>

        <SectionHeader
          align="center"
          className="mt-16 mb-10"
          eyebrow="Validation"
          title={
            <>
              Standard Schema <SectionAccent>First</SectionAccent>
            </>
          }
          description="Zero vendor lock-in. Validate params, headers, query, and payload schemas with any library conforming to the Standard Schema spec."
        />

        <div className="landing-animate-in landing-delay-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {schemaLibraries.map((library) => (
            <FeatureCard
              key={library.name}
              icon={library.icon}
              title={library.name}
              description={library.description}
              iconTone={library.iconTone}
              href="/docs"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

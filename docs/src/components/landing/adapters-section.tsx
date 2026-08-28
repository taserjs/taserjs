import type { ReactNode } from "react";
import {
  Box,
  Braces,
  Cloud,
  Cpu,
  Globe,
  Hexagon,
  Layers,
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

const integrations: {
  name: string;
  description: string;
  icon: ReactNode;
  iconTone: IconTone;
  href: string;
}[] = [
  {
    name: "Vite Plugin",
    description: "Virtual route modules, ambient types, and instant HMR.",
    icon: <Zap />,
    iconTone: "amber",
    href: "/docs/plugins/vite",
  },
  {
    name: "TanStack Start",
    description: "Fullstack React apps with TanStack Router loaders & Query.",
    icon: <Layers />,
    iconTone: "orange",
    href: "/docs/fullstack/tanstack-start",
  },
  {
    name: "Next.js",
    description: "Embed inside App Router with @taserjs/router-plugin/next.",
    icon: <Layers />,
    iconTone: "violet",
    href: "/docs/fullstack/nextjs",
  },
  {
    name: "Nitro Module",
    description: "Universal server engine for edge, serverless, and cloud.",
    icon: <Workflow />,
    iconTone: "indigo",
    href: "/docs/plugins/nitro",
  },
  {
    name: "Standalone API",
    description: "High-throughput, zero-host API built on web standards.",
    icon: <Box />,
    iconTone: "sky",
    href: "/docs/frameworks/standalone",
  },
  {
    name: "Web Standard Hosts",
    description: "Pass-through for Hono, Elysia, HatTip, and Web Fetch.",
    icon: <Globe />,
    iconTone: "emerald",
    href: "/docs/frameworks/fetch-native",
  },
  {
    name: "Express",
    description: "Layer file routing onto existing Express servers.",
    icon: <Server />,
    iconTone: "sky",
    href: "/docs/frameworks/express",
  },
  {
    name: "Fastify",
    description: "Coexist with Fastify plugins and lifecycle hooks.",
    icon: <Cpu />,
    iconTone: "cyan",
    href: "/docs/frameworks/fastify",
  },
  {
    name: "Deployment Presets",
    description: "Cloudflare Workers, Vercel, Node, Docker, Bun, and AWS Lambda.",
    icon: <Cloud />,
    iconTone: "rose",
    href: "/docs/deployments",
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
    name: "Standard Schema",
    description: "Zero lock-in. Any library conforming to Standard Schema.",
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
          eyebrow="Integrations"
          title={
            <>
              Framework Agnostic. <SectionAccent>Runtime Universal</SectionAccent>.
            </>
          }
          description="Build standalone APIs with Vite and Nitro, embed inside Next.js or TanStack Start, or layer onto Express, Fastify, and Web Standard hosts without rewriting a single handler."
        />

        <div className="landing-animate-in landing-delay-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((item) => (
            <FeatureCard
              key={item.name}
              icon={item.icon}
              title={item.name}
              description={item.description}
              iconTone={item.iconTone}
              href={item.href}
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
              href="/docs/validation/standard-schema"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

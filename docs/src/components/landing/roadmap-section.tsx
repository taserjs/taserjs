import type { ReactNode } from "react";
import { FileText, ShieldCheck, Radio, Blocks, Sparkles, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { SectionAccent, SectionHeader } from "./section-header";
import { SectionSeparator } from "./section-separator";

interface RoadmapItem {
  id: string;
  title: string;
  badge: string;
  status: "in-progress" | "planned";
  icon: ReactNode;
  iconTone: "orange" | "sky" | "violet" | "emerald";
  description: string;
  highlights: string[];
}

const roadmapItems: RoadmapItem[] = [
  {
    id: "openapi",
    title: "OpenAPI Specification Generation",
    badge: "In Development",
    status: "in-progress",
    icon: <FileText className="size-5" />,
    iconTone: "orange",
    description:
      "Auto-generate OpenAPI 3.1 YAML and JSON endpoints directly from your file routes, Standard Schema definitions, and return contracts. Zero manual Swagger spec writing.",
    highlights: ["OpenAPI 3.1 YAML/JSON", "Swagger UI endpoint", "Zero schema duplication"],
  },
  {
    id: "eslint",
    title: "ESLint Plugin for Router Rules",
    badge: "In Development",
    status: "in-progress",
    icon: <ShieldCheck className="size-5" />,
    iconTone: "emerald",
    description:
      "Dedicated @taserjs/eslint-plugin to enforce HTTP verb suffixes (.get.ts, .post.ts), catch invalid param patterns, and validate route exports right in your editor.",
    highlights: ["File naming linter", "Export contract checks", "CLI & CI/CD guards"],
  },
  {
    id: "realtime",
    title: "WebSockets & Server-Sent Events",
    badge: "Planned",
    status: "planned",
    icon: <Radio className="size-5" />,
    iconTone: "sky",
    description:
      "Realtime streaming routes (.ws.ts, .sse.ts) with typed event schemas, connection lifecycle hooks, and bi-directional type safety for live updates.",
    highlights: [".ws.ts & .sse.ts file routes", "Typed event channels", "Streaming client SDK"],
  },
  {
    id: "middleware",
    title: "Standard Middleware Ecosystem",
    badge: "Planned",
    status: "planned",
    icon: <Blocks className="size-5" />,
    iconTone: "violet",
    description:
      "A curated suite of typed middleware for CORS, Rate Limiting, JWT Auth, Request ID, and OpenTelemetry that cascade state cleanly into ctx.state.",
    highlights: ["CORS & Rate Limiting", "JWT & Session Auth", "OpenTelemetry logging"],
  },
];

const toneStyles = {
  orange: {
    icon: "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400",
    badge: "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400",
    hover: "hover:border-orange-500/30",
  },
  emerald: {
    icon: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    hover: "hover:border-emerald-500/30",
  },
  sky: {
    icon: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    badge: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    hover: "hover:border-sky-500/30",
  },
  violet: {
    icon: "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400",
    badge: "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400",
    hover: "hover:border-violet-500/30",
  },
};

export function RoadmapSection() {
  return (
    <section id="roadmap" className="relative bg-fd-muted/20 scroll-mt-14">
      <SectionSeparator />
      <div className="mx-auto max-w-(--fd-layout-width) px-6 py-16 md:py-24">
        <SectionHeader
          align="center"
          className="mb-12"
          eyebrow="Roadmap"
          title={
            <>
              What the <SectionAccent>future looks like</SectionAccent>
            </>
          }
          description="We're actively building the next generation of type-safe backend tooling. Here is what is on our horizon."
        />

        <div className="landing-animate-in landing-delay-2 grid grid-cols-1 gap-6 md:grid-cols-2">
          {roadmapItems.map((item) => {
            const styles = toneStyles[item.iconTone];
            return (
              <div
                key={item.id}
                className={cn(
                  "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-fd-border bg-fd-card p-6 shadow-sm transition-all duration-300",
                  "hover:-translate-y-1 hover:shadow-lg",
                  styles.hover,
                )}
              >
                <div>
                  {/* Top Bar: Icon + Status Badge */}
                  <div className="flex items-center justify-between gap-4">
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105",
                        styles.icon,
                      )}
                    >
                      {item.icon}
                    </div>

                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] font-semibold",
                        styles.badge,
                      )}
                    >
                      {item.status === "in-progress" ? (
                        <Sparkles className="size-3" />
                      ) : (
                        <Clock className="size-3" />
                      )}
                      {item.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="mt-5 text-lg font-semibold tracking-tight text-fd-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
                    {item.description}
                  </p>
                </div>

                {/* Highlights Tags */}
                <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-fd-border/50">
                  {item.highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="inline-flex items-center gap-1 rounded-md bg-fd-muted/50 px-2.5 py-1 text-[11px] font-medium text-fd-muted-foreground transition-colors group-hover:text-fd-foreground"
                    >
                      <CheckCircle2 className="size-3 text-fd-muted-foreground/70" />
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

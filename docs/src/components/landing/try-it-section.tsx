import { CheckCircle2 } from "lucide-react";

import { SectionAccent, SectionHeader } from "./section-header";
import { SectionSeparator } from "./section-separator";

const adapters = ["Express", "Hono", "Fastify", "Node", "Fetch"] as const;

export function TryItSection() {
  return (
    <section className="relative">
      <SectionSeparator />
      <div className="mx-auto max-w-(--fd-layout-width) px-6 py-16 md:py-24">
        <SectionHeader
          className="mb-10"
          title={
            <>
              Try it <SectionAccent>out</SectionAccent>
            </>
          }
          description="Scaffold a typed API in under a minute. Pick your adapter and start building."
        />

        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
          <div className="landing-animate-in landing-delay-2 overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-fd-border px-4 py-2.5 text-xs text-fd-muted-foreground">
              <span className="size-2.5 rounded-full bg-red-500/80" />
              <span className="size-2.5 rounded-full bg-yellow-500/80" />
              <span className="size-2.5 rounded-full bg-green-500/80" />
              <span className="ml-2">Terminal</span>
            </div>
            <pre className="overflow-x-auto p-4 text-sm leading-relaxed min-h-44">
              <code className="text-fd-foreground">
                <span className="landing-line text-fd-muted-foreground">
                  # scaffold a project in under a minute
                </span>
                {"\n"}
                <span className="landing-line landing-line-delay-1">
                  <span className="text-fd-muted-foreground">$</span>{" "}
                  <span className="text-fd-primary">npm create taserjs@latest</span> my-api
                  <span className="landing-cursor align-[-0.1em] h-[1em]" aria-hidden />
                </span>
                {"\n\n"}
                <span className="landing-line landing-line-delay-2 text-fd-muted-foreground">
                  ◇ Project name
                </span>
                {"\n"}
                <span className="landing-line landing-line-delay-2">│ my-api</span>
                {"\n"}
                <span className="landing-line landing-line-delay-3 text-fd-muted-foreground">
                  ◆ Choose a framework
                </span>
                {"\n"}
                <span className="landing-line landing-line-delay-3">
                  │ <span className="text-fd-primary">● Express</span>
                </span>
                {"\n"}
                <span className="landing-line landing-line-delay-4 text-fd-muted-foreground">
                  │ ○ Hono ○ Fastify ○ Node
                </span>
              </code>
            </pre>
          </div>

          <div className="landing-animate-in landing-delay-3 flex flex-col justify-center rounded-xl border border-fd-border bg-fd-background p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-fd-primary/25">
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-fd-border bg-fd-muted text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" aria-hidden />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">New API scaffolded!</h3>
            <p className="mt-2 text-sm text-fd-muted-foreground">
              Power of file-based routing, full chain inference, CLI watch mode all generated and
              ready for <code className="rounded bg-fd-muted px-1.5 py-0.5 text-xs">pnpm dev</code>.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {adapters.map((name) => (
                <li
                  key={name}
                  className="rounded-full border border-fd-border bg-fd-card px-3 py-1 text-xs font-medium text-fd-muted-foreground transition-colors hover:border-fd-primary/40 hover:text-fd-foreground"
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

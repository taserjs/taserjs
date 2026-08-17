import { CheckCircle2, Terminal as TerminalIcon } from "lucide-react";

import { SectionAccent, SectionHeader } from "./section-header";
import { SectionSeparator } from "./section-separator";
import { WindowFrame } from "./window-frame";

const adapters = ["Express", "Hono", "Fastify", "Node", "Fetch"] as const;

export function TryItSection() {
  return (
    <section id="try-it" className="relative scroll-mt-14">
      <SectionSeparator />
      <div className="mx-auto max-w-(--fd-layout-width) px-6 py-16 md:py-24">
        <SectionHeader
          align="center"
          className="mb-10"
          eyebrow="Quick Start"
          title={
            <>
              Scaffold a typed API <SectionAccent>in seconds</SectionAccent>
            </>
          }
          description="Choose your favorite framework adapter and get instant file routing, watch-mode manifest codegen, and full-chain inference out of the box."
        />

        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
          <div className="landing-animate-in landing-delay-2">
            <WindowFrame
              title={
                <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-fd-foreground">
                  <TerminalIcon className="size-3.5 text-fd-muted-foreground" />
                  Terminal
                </span>
              }
              className="h-full"
            >
              <pre className="overflow-x-auto p-5 text-sm leading-relaxed min-h-44">
                <code className="text-fd-foreground font-mono text-xs">
                  <span className="landing-line text-fd-muted-foreground">
                    # scaffold a project in seconds
                  </span>
                  {"\n"}
                  <span className="landing-line landing-line-delay-1">
                    <span className="text-fd-muted-foreground">$</span>{" "}
                    <span className="text-fd-primary font-semibold">npm create taserjs@latest</span>{" "}
                    my-api
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
                    │ <span className="text-fd-primary font-semibold">● Express</span>
                  </span>
                  {"\n"}
                  <span className="landing-line landing-line-delay-4 text-fd-muted-foreground">
                    │ ○ Hono ○ Fastify ○ Node
                  </span>
                </code>
              </pre>
            </WindowFrame>
          </div>

          <div className="landing-animate-in landing-delay-3 flex flex-col justify-center rounded-2xl border border-fd-border bg-fd-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-fd-primary/25">
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" aria-hidden />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">New API scaffolded!</h3>
            <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
              Preconfigured with TypeScript strict mode, watch-mode manifest codegen, and full-chain
              type inference. Ready for{" "}
              <code className="rounded bg-fd-muted px-1.5 py-0.5 font-mono text-xs text-fd-foreground">
                pnpm dev
              </code>
              .
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {adapters.map((name) => (
                <li
                  key={name}
                  className="rounded-full border border-fd-border bg-fd-muted/40 px-3 py-1 text-xs font-medium text-fd-muted-foreground transition-colors hover:border-fd-primary/40 hover:text-fd-foreground"
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

import { Heart, Sparkles } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { XIcon } from "@/components/icons/x-icon";
import { SectionSeparator } from "./section-separator";
import Image from "next/image";

export function AuthorSection() {
  return (
    <section className="relative scroll-mt-14">
      <SectionSeparator />
      <div className="mx-auto max-w-(--fd-layout-width) px-6 py-12 md:py-16">
        <div className="relative overflow-hidden rounded-2xl border border-fd-border bg-fd-card/60 p-6 md:p-8 backdrop-blur-sm shadow-sm transition-all hover:border-fd-primary/20">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              {/* Author Avatar */}
              <div className="relative size-16 shrink-0 overflow-hidden rounded-full border-2 border-orange-500/30 bg-fd-muted ring-4 ring-orange-500/10 shadow-md">
                <Image
                  src="https://github.com/tzsk.png"
                  alt="Kazi Ahmed"
                  width={64}
                  height={64}
                  unoptimized
                  className="size-full object-cover"
                />
              </div>

              {/* Author Details */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-lg font-semibold tracking-tight text-fd-foreground">
                    Kazi Ahmed
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                    <Sparkles className="size-2.5" />
                    Creator
                  </span>
                </div>
                <p className="text-xs text-fd-muted-foreground leading-relaxed max-w-md">
                  Crafting type-safe developer tools, runtime adapters, and deterministic routing
                  engines for TypeScript.
                </p>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
              <a
                href="https://github.com/tzsk"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-fd-border bg-fd-muted/40 px-3.5 py-2 text-xs font-medium text-fd-foreground transition-all hover:bg-fd-accent hover:border-fd-primary/30 hover:-translate-y-0.5"
              >
                <GithubIcon className="size-3.5" />
                <span>@tzsk</span>
              </a>
              <a
                href="https://x.com/KaziAhmedDev"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-fd-border bg-fd-muted/40 px-3.5 py-2 text-xs font-medium text-fd-foreground transition-all hover:bg-fd-accent hover:border-fd-primary/30 hover:-translate-y-0.5"
              >
                <XIcon className="size-3.5" />
                <span>@KaziAhmedDev</span>
              </a>
              <a
                href="https://github.com/sponsors/tzsk"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 transition-all hover:bg-rose-500/20 hover:-translate-y-0.5"
              >
                <Heart className="size-3.5" />
                <span>Sponsor</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import { Heart, Sparkles } from "lucide-react";

import { sponsorUrl } from "@/lib/shared";
import { SectionAccent, SectionHeader } from "./section-header";
import { SectionSeparator } from "./section-separator";

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
            description="Taser.js is 100% open source. Sponsoring funds continuous performance optimizations, runtime adapter development, codegen tooling, and long-term maintenance."
          />
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
              <h3 className="text-xl font-semibold tracking-tight">Sponsor Taser.js Development</h3>
              <p className="mt-2 text-sm text-fd-muted-foreground">
                Support sustainable open source tooling. Contributions directly support new runtime
                adapters, compiler features, instant watch-mode codegen, and Standard Schema
                integrations.
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

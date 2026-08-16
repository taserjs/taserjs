"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/logo";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { heroCodeTabs } from "./hero-code-sample";
import { CodeXmlIcon } from "lucide-react";

import { heroTabSources } from "@/components/landing/hero-code-sample";

export function HeroCode() {
  const [activeId, setActiveId] = useState("route");

  return (
    <div className="min-w-0 w-full overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-xl shadow-black/5 dark:shadow-black/40">
      <div className="flex items-center gap-2 border-b border-fd-border bg-fd-muted/40 px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-red-500/80" />
        <span className="size-2.5 rounded-full bg-yellow-500/80" />
        <span className="size-2.5 rounded-full bg-green-500/80" />
        <div className="ml-2 flex min-w-0 flex-1 items-center">
          <Logo className="h-3.5 shrink-0" />
        </div>
      </div>

      <div className="hero-code-tabs flex gap-1 overflow-x-auto border-b border-fd-border px-2 py-1.5">
        {heroCodeTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveId(tab.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors",
              activeId === tab.id
                ? "bg-landing-accent-22 text-fd-accent-foreground"
                : "text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground",
            )}
          >
            <CodeXmlIcon className="size-4 shrink-0" />
            {tab.filename}
          </button>
        ))}
      </div>

      <div className="hero-code-block max-h-88">
        <DynamicCodeBlock
          code={heroTabSources[activeId] ?? ""}
          lang="ts"
          codeblock={{ style: { borderRadius: 0, width: "100%" } }}
        />
      </div>
    </div>
  );
}

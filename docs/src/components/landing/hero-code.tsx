"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/logo";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { heroCodeTabs, heroTabSources } from "./hero-code-sample";
import { CodeXmlIcon } from "lucide-react";
import { WindowFrame } from "./window-frame";

export function HeroCode() {
  const [activeId, setActiveId] = useState("route");

  return (
    <WindowFrame
      title={<Logo className="h-3.5 shrink-0" />}
      subHeader={
        <div className="hero-code-tabs flex gap-1 overflow-x-auto px-2 py-1.5">
          {heroCodeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveId(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer",
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
      }
      className="min-w-0 w-full shadow-xl shadow-black/5 dark:shadow-black/40"
    >
      <div className="hero-code-block">
        <DynamicCodeBlock
          code={heroTabSources[activeId] ?? ""}
          lang="ts"
          codeblock={{
            className: "!my-0 !rounded-none !border-0 !shadow-none !bg-transparent",
            style: { borderRadius: 0, width: "100%" },
          }}
        />
      </div>
    </WindowFrame>
  );
}

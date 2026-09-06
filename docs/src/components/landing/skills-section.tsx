"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Terminal as TerminalIcon,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { SectionAccent, SectionHeader } from "./section-header";
import { SectionSeparator } from "./section-separator";
import { WindowFrame } from "./window-frame";
import Link from "next/link";

type ToolType = "npx" | "pnpm" | "bun";

const skillCommands: Record<ToolType, string> = {
  npx: "npx skills add taserjs/taserjs",
  pnpm: "pnpm dlx skills add taserjs/taserjs",
  bun: "bunx skills add taserjs/taserjs",
};

const supportedAgents = ["Cursor", "Claude Code", "Windsurf", "GitHub Copilot", "Cline", "Codex"];

const promptPresets = [
  {
    id: "nextjs",
    label: "Next.js Setup",
    prompt:
      "Set up Taser.js API routes in my Next.js project with Zod validation, a protected layout, and a typed client",
  },
  {
    id: "endpoint",
    label: "New Route",
    prompt:
      "Create a type-safe POST /api/users endpoint in Taser.js with body validation and compile-time return contracts",
  },
  {
    id: "migrate",
    label: "Express Migration",
    prompt:
      "Migrate my existing Express routes to Taser.js using host pass-through without breaking current APIs",
  },
  {
    id: "layout",
    label: "Auth Layout",
    prompt:
      "Create an auth layout middleware for /api/admin/* that verifies JWT bearer tokens and injects user into ctx.state",
  },
];

export function SkillsSection() {
  const [activeTool, setActiveTool] = useState<ToolType>("npx");
  const [activePromptId, setActivePromptId] = useState("nextjs");
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const command = skillCommands[activeTool];
  const activePrompt =
    promptPresets.find((p) => p.id === activePromptId)?.prompt ?? promptPresets[0].prompt;

  const handleCopyCommand = async () => {
    await navigator.clipboard.writeText(command);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(activePrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <section id="skills" className="relative scroll-mt-14 bg-fd-muted/10">
      <SectionSeparator />
      <div className="mx-auto max-w-(--fd-layout-width) px-6 py-14 md:py-20">
        <SectionHeader
          align="center"
          className="mx-auto max-w-3xl"
          eyebrow="Agent Skills"
          title={
            <>
              Supercharge your AI agent with official <SectionAccent>Taser.js Skills</SectionAccent>
            </>
          }
          description="Equip Cursor, Claude Code, Windsurf, Copilot, Cline, and Codex with deep knowledge of Taser.js file conventions, cascading layouts, Standard Schema validation, and client RPC."
        />

        {/* Side-by-Side Quickstart Window */}
        <div className="mx-auto mt-10 max-w-5xl">
          <WindowFrame
            tone="orange"
            title="AI Agent Quickstart Guide"
            badge={
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                <Sparkles className="size-2.5" />
                Open Agent Skill
              </span>
            }
          >
            <div className="grid grid-cols-1 divide-y divide-fd-border/60 lg:grid-cols-2 lg:divide-y-0 lg:divide-x">
              {/* LEFT COLUMN: Installation */}
              <div className="flex flex-col justify-between gap-6 p-5 sm:p-6 lg:p-7">
                <div className="space-y-4">
                  {/* Step Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-full bg-orange-500/15 text-[11px] font-bold text-orange-600 dark:text-orange-400">
                        1
                      </span>
                      <span className="text-xs font-semibold tracking-wide text-fd-foreground uppercase">
                        Install the Skill
                      </span>
                    </div>

                    {/* Tool Selector */}
                    <div className="flex items-center gap-1 rounded-lg border border-fd-border bg-fd-muted/40 p-0.5 text-xs">
                      {(["npx", "pnpm", "bun"] as ToolType[]).map((tool) => (
                        <button
                          key={tool}
                          type="button"
                          onClick={() => setActiveTool(tool)}
                          className={cn(
                            "rounded-md px-2.5 py-0.5 font-mono text-[11px] font-medium transition-all",
                            activeTool === tool
                              ? "bg-fd-background text-fd-foreground shadow-xs"
                              : "text-fd-muted-foreground hover:text-fd-foreground",
                          )}
                        >
                          {tool}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Terminal Box */}
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-fd-border bg-fd-muted/30 p-3 sm:p-3.5 font-mono text-xs sm:text-sm">
                    <div className="flex items-center gap-2.5 min-w-0 overflow-x-auto">
                      <span className="text-orange-500 font-semibold select-none">$</span>
                      <span className="text-fd-foreground select-all">{command}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCommand}
                      className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-fd-border bg-fd-card text-fd-foreground transition-all hover:bg-fd-accent hover:border-fd-primary/30 active:scale-95"
                      aria-label="Copy install command"
                    >
                      {copiedCommand ? (
                        <Check className="size-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="size-3.5 text-fd-muted-foreground" />
                      )}
                    </button>
                  </div>

                  <p className="text-xs leading-relaxed text-fd-muted-foreground">
                    Run this command in your repository root to register Taser.js rules and decision
                    workflows directly with your local coding assistant.
                  </p>
                </div>

                {/* Supported Assistants Footer */}
                <div className="space-y-2 border-t border-fd-border/60 pt-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-fd-foreground">
                    <TerminalIcon className="size-3.5 text-orange-500" />
                    <span>Works out of the box with:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {supportedAgents.map((agent) => (
                      <span
                        key={agent}
                        className="rounded-md border border-fd-border/70 bg-fd-muted/40 px-2 py-0.5 text-[11px] text-fd-muted-foreground"
                      >
                        {agent}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Prompts */}
              <div className="flex flex-col justify-between gap-6 p-5 sm:p-6 lg:p-7">
                <div className="space-y-4">
                  {/* Step Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-full bg-orange-500/15 text-[11px] font-bold text-orange-600 dark:text-orange-400">
                        2
                      </span>
                      <span className="text-xs font-semibold tracking-wide text-fd-foreground uppercase">
                        Ask Your AI Assistant
                      </span>
                    </div>
                  </div>

                  {/* Preset Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {promptPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setActivePromptId(preset.id)}
                        className={cn(
                          "rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
                          activePromptId === preset.id
                            ? "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold shadow-xs"
                            : "border-fd-border bg-fd-muted/40 text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground",
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Prompt Box */}
                  <div className="relative rounded-xl border border-fd-border bg-fd-muted/30 p-3.5 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <MessageSquare className="size-4 shrink-0 mt-0.5 text-orange-500" />
                        <p className="text-xs sm:text-sm text-fd-foreground leading-relaxed">
                          &ldquo;{activePrompt}&rdquo;
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyPrompt}
                        className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-fd-border bg-fd-card text-fd-foreground transition-all hover:bg-fd-accent hover:border-fd-primary/30 active:scale-95"
                        aria-label="Copy prompt"
                        title="Copy prompt"
                      >
                        {copiedPrompt ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="size-3.5 text-fd-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Phased Builder Rule Note */}
                <div className="flex items-start gap-2 rounded-xl border border-fd-border/70 bg-fd-muted/20 p-3 text-xs text-fd-muted-foreground">
                  <Lightbulb className="size-4 shrink-0 mt-0.5 text-amber-500" />
                  <span>
                    The skill ensures the Agent follows the Taser.js conventions and best practices.
                  </span>
                </div>
              </div>
            </div>
          </WindowFrame>
        </div>

        {/* Link to docs */}
        <div className="mt-8 text-center sm:mt-10">
          <Link
            href="/docs#ai-agent-skill"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline"
          >
            <span>Learn how agent skills work in the documentation</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

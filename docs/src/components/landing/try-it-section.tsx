"use client";

import { useState } from "react";
import { Check, Copy, Terminal as TerminalIcon, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { SectionAccent, SectionHeader } from "./section-header";
import { SectionSeparator } from "./section-separator";
import { WindowFrame } from "./window-frame";

type ProjectType =
  | "node"
  | "express"
  | "fastify"
  | "hono"
  | "bun"
  | "deno"
  | "aws-lambda"
  | "cloudflare-workers"
  | "netlify"
  | "vercel"
  | "azure-functions"
  | "google-cloud-run";

type Database = "drizzle" | "prisma" | "kysely" | "none";
type Driver = "sqlite" | "postgres" | "mysql";
type Validator = "zod" | "arktype" | "valibot";
type Logger = "pino" | "winston" | "none";
type PackageManager = "pnpm" | "npm" | "bun" | "yarn";

const projectTypes: { id: ProjectType; label: string }[] = [
  { id: "node", label: "Node.js" },
  { id: "express", label: "Express" },
  { id: "fastify", label: "Fastify" },
  { id: "hono", label: "Hono" },
  { id: "bun", label: "Bun" },
  { id: "deno", label: "Deno" },
  { id: "aws-lambda", label: "AWS Lambda" },
  { id: "cloudflare-workers", label: "Cloudflare" },
  { id: "netlify", label: "Netlify" },
  { id: "vercel", label: "Vercel" },
  { id: "azure-functions", label: "Azure" },
  { id: "google-cloud-run", label: "Cloud Run" },
];

const databases: { id: Database; label: string }[] = [
  { id: "drizzle", label: "Drizzle" },
  { id: "prisma", label: "Prisma" },
  { id: "kysely", label: "Kysely" },
  { id: "none", label: "None" },
];

const drivers: { id: Driver; label: string }[] = [
  { id: "postgres", label: "PostgreSQL" },
  { id: "sqlite", label: "SQLite" },
  { id: "mysql", label: "MySQL" },
];

const validators: { id: Validator; label: string }[] = [
  { id: "zod", label: "Zod" },
  { id: "arktype", label: "ArkType" },
  { id: "valibot", label: "Valibot" },
];

const loggers: { id: Logger; label: string }[] = [
  { id: "pino", label: "Pino" },
  { id: "winston", label: "Winston" },
  { id: "none", label: "None" },
];

const packageManagers: { id: PackageManager; prefix: string }[] = [
  { id: "pnpm", prefix: "pnpm create taserjs@latest" },
  { id: "npm", prefix: "npm create taserjs@latest" },
  { id: "bun", prefix: "bun create taserjs@latest" },
  { id: "yarn", prefix: "yarn create taserjs" },
];

export function TryItSection() {
  const [projectType, setProjectType] = useState<ProjectType>("express");
  const [db, setDb] = useState<Database>("drizzle");
  const [driver, setDriver] = useState<Driver>("postgres");
  const [validator, setValidator] = useState<Validator>("zod");
  const [logger, setLogger] = useState<Logger>("pino");
  const [pm, setPm] = useState<PackageManager>("pnpm");
  const [copied, setCopied] = useState(false);

  // Generate the reactive command string
  const getCommand = () => {
    const pmConfig = packageManagers.find((p) => p.id === pm) ?? packageManagers[0];
    const parts = [pmConfig.prefix, "my-api", `--type ${projectType}`];

    if (db !== "none") {
      parts.push(`--db ${db}`);
      parts.push(`--driver ${driver}`);
    }
    if (validator) {
      parts.push(`--validator ${validator}`);
    }
    if (logger !== "none") {
      parts.push(`--logger ${logger}`);
    }
    parts.push("-y");

    return parts.join(" ");
  };

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(getCommand());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const currentTypeLabel = projectTypes.find((t) => t.id === projectType)?.label ?? "Express";
  const currentDbLabel = databases.find((d) => d.id === db)?.label ?? "None";
  const currentDriverLabel = drivers.find((d) => d.id === driver)?.label ?? "PostgreSQL";
  const currentValidatorLabel = validators.find((v) => v.id === validator)?.label ?? "Zod";
  const currentLoggerLabel = loggers.find((l) => l.id === logger)?.label ?? "None";

  return (
    <section id="try-it" className="relative scroll-mt-14">
      <SectionSeparator />
      <div className="mx-auto max-w-(--fd-layout-width) px-6 py-16 md:py-24">
        <SectionHeader
          align="center"
          className="mb-12"
          eyebrow="Quick Start"
          title={
            <>
              Scaffold your stack <SectionAccent>in seconds</SectionAccent>
            </>
          }
          description="Interactive CLI with batteries included: pick your runtime adapter, database ORM, Standard Schema validator, and logger."
        />

        {/* Top 2 Cards: Height-Aligned Grid */}
        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
          {/* Left Column: Terminal Window */}
          <div className="h-full flex flex-col">
            <WindowFrame
              title={
                <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-fd-foreground">
                  <TerminalIcon className="size-3.5 text-fd-muted-foreground" />
                  bash — create-taser
                </span>
              }
              className="h-full flex flex-col justify-between shadow-lg shadow-black/5 dark:shadow-black/30"
            >
              <div className="overflow-x-auto p-5 text-xs font-mono leading-relaxed select-text [scrollbar-width:thin] flex-1 flex flex-col justify-between">
                <div>
                  {/* Banner */}
                  <div className="mb-3">
                    <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[11px] font-bold text-cyan-600 dark:text-cyan-300">
                      create-taser
                    </span>
                    <span className="ml-2 text-fd-muted-foreground text-[11px]">v0.0.14</span>
                  </div>

                  {/* Step 1: Project Name */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-fd-muted-foreground">
                      <span className="text-cyan-500">◇</span>
                      <span>Project name</span>
                    </div>
                    <div className="border-l-2 border-fd-border/70 pl-4 text-fd-foreground font-semibold">
                      my-api
                    </div>
                  </div>

                  {/* Step 2: Project Type (all 12 runtimes/frameworks) */}
                  <div className="space-y-0.5 mt-2">
                    <div className="flex items-center gap-2 text-fd-muted-foreground">
                      <span className="text-cyan-500">◇</span>
                      <span>Project type (runtime / framework)</span>
                    </div>
                    <div className="border-l-2 border-fd-border/70 pl-4 flex flex-wrap gap-x-2.5 gap-y-1">
                      {projectTypes.map((t) => (
                        <span
                          key={t.id}
                          className={cn(
                            "transition-colors text-[11px]",
                            t.id === projectType
                              ? "text-orange-500 font-bold"
                              : "text-fd-muted-foreground/60",
                          )}
                        >
                          {t.id === projectType ? "● " : "○ "}
                          {t.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: Database Selection (Blue tint) */}
                  <div className="space-y-0.5 mt-2">
                    <div className="flex items-center gap-2 text-fd-muted-foreground">
                      <span className="text-cyan-500">◇</span>
                      <span>Database</span>
                    </div>
                    <div className="border-l-2 border-fd-border/70 pl-4 flex flex-wrap gap-x-3 gap-y-1">
                      {databases.map((d) => (
                        <span
                          key={d.id}
                          className={cn(
                            "transition-colors",
                            d.id === db ? "text-sky-500 font-bold" : "text-fd-muted-foreground/60",
                          )}
                        >
                          {d.id === db ? "● " : "○ "}
                          {d.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Step 3b: Driver Selection (if DB selected) */}
                  {db !== "none" && (
                    <div className="space-y-0.5 mt-2">
                      <div className="flex items-center gap-2 text-fd-muted-foreground">
                        <span className="text-cyan-500">◇</span>
                        <span>Database driver</span>
                      </div>
                      <div className="border-l-2 border-fd-border/70 pl-4 flex flex-wrap gap-x-3 gap-y-1">
                        {drivers.map((drv) => (
                          <span
                            key={drv.id}
                            className={cn(
                              "transition-colors",
                              drv.id === driver
                                ? "text-fd-foreground font-bold"
                                : "text-fd-muted-foreground/60",
                            )}
                          >
                            {drv.id === driver ? "● " : "○ "}
                            {drv.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 4: Validator Selection (Green tint) */}
                  <div className="space-y-0.5 mt-2">
                    <div className="flex items-center gap-2 text-fd-muted-foreground">
                      <span className="text-cyan-500">◇</span>
                      <span>Validator</span>
                    </div>
                    <div className="border-l-2 border-fd-border/70 pl-4 flex flex-wrap gap-x-3 gap-y-1">
                      {validators.map((v) => (
                        <span
                          key={v.id}
                          className={cn(
                            "transition-colors",
                            v.id === validator
                              ? "text-emerald-500 font-bold"
                              : "text-fd-muted-foreground/60",
                          )}
                        >
                          {v.id === validator ? "● " : "○ "}
                          {v.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Step 5: Logger Selection (Purple tint) */}
                  <div className="space-y-0.5 mt-2">
                    <div className="flex items-center gap-2 text-fd-muted-foreground">
                      <span className="text-cyan-500">◇</span>
                      <span>Logger</span>
                    </div>
                    <div className="border-l-2 border-fd-border/70 pl-4 flex flex-wrap gap-x-3 gap-y-1">
                      {loggers.map((l) => (
                        <span
                          key={l.id}
                          className={cn(
                            "transition-colors",
                            l.id === logger
                              ? "text-purple-500 font-bold"
                              : "text-fd-muted-foreground/60",
                          )}
                        >
                          {l.id === logger ? "● " : "○ "}
                          {l.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Completion Result */}
                <div className="mt-4 pt-3 border-t border-fd-border/60 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>✔</span>
                    <span>Scaffolded ./my-api successfully!</span>
                  </div>
                  <div className="text-fd-muted-foreground pl-4 text-[11px]">
                    Created{" "}
                    <span className="text-fd-foreground font-medium">{currentTypeLabel}</span> app
                    with{" "}
                    {db !== "none" ? (
                      <span className="text-fd-foreground font-medium">
                        {currentDbLabel} ({currentDriverLabel})
                      </span>
                    ) : (
                      "no database"
                    )}
                    ,{" "}
                    <span className="text-fd-foreground font-medium">{currentValidatorLabel}</span>{" "}
                    validation, and{" "}
                    {logger !== "none" ? (
                      <span className="text-fd-foreground font-medium">{currentLoggerLabel}</span>
                    ) : (
                      "console"
                    )}{" "}
                    logging.
                  </div>
                </div>
              </div>
            </WindowFrame>
          </div>

          {/* Right Column: Stack Configurator (Badge style narrow pills scattered under labels) */}
          <div className="h-full flex flex-col">
            <div className="rounded-2xl border border-fd-border bg-fd-card p-6 shadow-sm flex flex-col justify-between h-full space-y-6">
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <SlidersHorizontal className="size-4" />
                  </div>
                  <h3 className="text-xs font-semibold tracking-wider text-fd-foreground uppercase">
                    Configure Your Stack
                  </h3>
                </div>

                {/* 1. Framework / Runtime (Badge pills with orange tint) */}
                <div>
                  <label className="block mb-2 text-[11px] font-semibold text-fd-muted-foreground uppercase tracking-wider">
                    Runtime / Framework
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {projectTypes.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setProjectType(t.id)}
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all cursor-pointer",
                          projectType === t.id
                            ? "border-orange-500/40 bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/30 font-semibold"
                            : "border-fd-border bg-fd-muted/30 text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground",
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Database & Driver (Badge pills with blue & gray tints) */}
                <div>
                  <label className="block mb-2 text-[11px] font-semibold text-fd-muted-foreground uppercase tracking-wider">
                    Database ORM
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {databases.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDb(d.id)}
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all cursor-pointer",
                          db === d.id
                            ? "border-sky-500/40 bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/30 font-semibold"
                            : "border-fd-border bg-fd-muted/30 text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground",
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>

                  {db !== "none" && (
                    <div className="mt-3 pl-3 border-l-2 border-fd-border/70">
                      <label className="block mb-1.5 text-[10px] font-semibold text-fd-muted-foreground uppercase tracking-wider">
                        Driver
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {drivers.map((drv) => (
                          <button
                            key={drv.id}
                            type="button"
                            onClick={() => setDriver(drv.id)}
                            className={cn(
                              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all cursor-pointer",
                              driver === drv.id
                                ? "border-fd-border bg-fd-accent text-fd-foreground font-semibold shadow-xs"
                                : "border-fd-border/80 bg-fd-muted/20 text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground",
                            )}
                          >
                            {drv.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Validator (Badge pills with green tint) */}
                <div>
                  <label className="block mb-2 text-[11px] font-semibold text-fd-muted-foreground uppercase tracking-wider">
                    Validator
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {validators.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setValidator(v.id)}
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all cursor-pointer",
                          validator === v.id
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30 font-semibold"
                            : "border-fd-border bg-fd-muted/30 text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground",
                        )}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Logger (Badge pills with purple tint) */}
                <div>
                  <label className="block mb-2 text-[11px] font-semibold text-fd-muted-foreground uppercase tracking-wider">
                    Logger
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {loggers.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setLogger(l.id)}
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all cursor-pointer",
                          logger === l.id
                            ? "border-purple-500/40 bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/30 font-semibold"
                            : "border-fd-border bg-fd-muted/30 text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground",
                        )}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width One-Liner Command Box Spanning the Entire Bottom */}
        <div className="mt-6 rounded-2xl border border-fd-border bg-fd-card p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-fd-foreground uppercase tracking-wider">
              One-Liner Command
            </span>
            <div className="flex items-center gap-1">
              {packageManagers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPm(p.id)}
                  className={cn(
                    "rounded px-2.5 py-0.5 font-mono text-[11px] font-medium transition-colors cursor-pointer",
                    pm === p.id
                      ? "bg-fd-primary text-fd-primary-foreground font-semibold"
                      : "text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-muted",
                  )}
                >
                  {p.id}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-between rounded-xl border border-fd-border bg-fd-muted/40 p-3 font-mono text-xs text-fd-foreground">
            <span className="truncate pr-8 select-all">{getCommand()}</span>
            <button
              type="button"
              onClick={copyCommand}
              className="absolute right-2 flex size-7 items-center justify-center rounded-lg border border-fd-border bg-fd-background text-fd-muted-foreground shadow-xs transition-colors hover:bg-fd-accent hover:text-fd-foreground cursor-pointer"
              title="Copy command"
            >
              {copied ? (
                <Check className="size-3.5 text-emerald-500" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          </div>

          <p className="text-[11px] text-fd-muted-foreground leading-relaxed">
            Run this command to bypass interactive prompts and generate your project instantly in CI
            or your terminal.
          </p>
        </div>
      </div>
    </section>
  );
}

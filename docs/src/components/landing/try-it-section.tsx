"use client";

import { Check, Copy, Terminal as TerminalIcon, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/cn";

import { SectionAccent, SectionHeader } from "./section-header";
import { SectionSeparator } from "./section-separator";
import {
  DATABASES,
  DRIVERS,
  FRAMEWORKS,
  HOSTS,
  LOGGERS,
  PACKAGE_MANAGERS,
  PRESETS,
  TEMPLATES,
  VALIDATORS,
  buildCommand,
  resolveStarter,
  type Database,
  type Driver,
  type FrameworkId,
  type HostId,
  type Logger,
  type Option,
  type PackageManager,
  type PresetId,
  type TemplateId,
  type Validator,
} from "./try-it-config";
import { WindowFrame } from "./window-frame";

type Tone = "orange" | "amber" | "cyan" | "sky" | "purple" | "emerald" | "neutral";

// Full class names are required so Tailwind can detect them.
const TONES: Record<Tone, { terminal: string; chip: string }> = {
  orange: {
    terminal: "text-orange-500 font-bold",
    chip: "border-orange-500/40 bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/30 font-semibold",
  },
  amber: {
    terminal: "text-amber-500 font-bold",
    chip: "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30 font-semibold",
  },
  cyan: {
    terminal: "text-cyan-500 font-bold",
    chip: "border-cyan-500/40 bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30 font-semibold",
  },
  sky: {
    terminal: "text-sky-500 font-bold",
    chip: "border-sky-500/40 bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/30 font-semibold",
  },
  purple: {
    terminal: "text-purple-500 font-bold",
    chip: "border-purple-500/40 bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/30 font-semibold",
  },
  emerald: {
    terminal: "text-emerald-500 font-bold",
    chip: "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30 font-semibold",
  },
  neutral: {
    terminal: "text-fd-foreground font-bold",
    chip: "border-fd-border bg-fd-accent text-fd-foreground font-semibold shadow-xs",
  },
};

const CHIP_IDLE =
  "border-fd-border bg-fd-muted/30 text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground";
const CHIP_DISABLED = "border-fd-border/60 bg-fd-muted/10 text-fd-muted-foreground/40";

const labelOf = <T extends string>(options: Option<T>[], id: T): string =>
  options.find((option) => option.id === id)?.label ?? id;

function TerminalStep<T extends string>({
  label,
  options,
  value,
  tone,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  tone: Tone;
}) {
  return (
    <div className="space-y-0.5 mt-2">
      <div className="flex items-center gap-2 text-fd-muted-foreground">
        <span className="text-cyan-500">◇</span>
        <span>{label}</span>
      </div>
      <div className="border-l-2 border-fd-border/70 pl-4 flex flex-wrap gap-x-2.5 gap-y-1">
        {options.map((option) => (
          <span
            key={option.id}
            className={cn(
              "transition-colors text-[11px]",
              option.id === value ? TONES[tone].terminal : "text-fd-muted-foreground/60",
            )}
          >
            {option.id === value ? "● " : "○ "}
            {option.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChipGroup<T extends string>({
  label,
  options,
  value,
  tone,
  onChange,
  disabled = [],
  small = false,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  tone: Tone;
  onChange: (id: T) => void;
  disabled?: T[];
  small?: boolean;
}) {
  return (
    <div>
      <label
        className={cn(
          "block font-semibold text-fd-muted-foreground uppercase tracking-wider",
          small ? "mb-1.5 text-[10px]" : "mb-2 text-[11px]",
        )}
      >
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled.includes(option.id)}
            onClick={() => onChange(option.id)}
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all",
              disabled.includes(option.id)
                ? CHIP_DISABLED
                : cn("cursor-pointer", option.id === value ? TONES[tone].chip : CHIP_IDLE),
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TryItSection() {
  const [framework, setFramework] = useState<FrameworkId>("none");
  const [template, setTemplate] = useState<TemplateId>("react");
  const [host, setHost] = useState<HostId>("none");
  const [preset, setPreset] = useState<PresetId>("node-server");
  const [db, setDb] = useState<Database>("drizzle");
  const [driver, setDriver] = useState<Driver>("sqlite");
  const [validator, setValidator] = useState<Validator>("zod");
  const [logger, setLogger] = useState<Logger>("pino");
  const [packageManager, setPackageManager] = useState<PackageManager>("pnpm");
  const [copied, setCopied] = useState(false);

  const choices = {
    framework,
    template,
    host,
    preset,
    db,
    driver,
    validator,
    logger,
    packageManager,
  };
  const resolved = resolveStarter(choices);
  const command = buildCommand(choices);

  const cloudflareSelected = resolved.preset?.startsWith("cloudflare") ?? false;
  const nodeOnlyHosts = HOSTS.filter((option) => option.needsNode).map((option) => option.id);

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the command stays selectable.
    }
  };

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
          description="Interactive CLI with batteries included: pick an API-only project, a Vite web app or a fullstack framework, then add a host server, deployment target, database, validator, and logger."
        />

        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
          <div className="h-full flex flex-col">
            <WindowFrame
              title={
                <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-fd-foreground">
                  <TerminalIcon className="size-3.5 text-fd-muted-foreground" />
                  bash — create-taserjs
                </span>
              }
              className="h-full flex flex-col justify-between shadow-lg shadow-black/5 dark:shadow-black/30"
            >
              <div className="overflow-x-auto p-5 text-xs font-mono leading-relaxed select-text scrollbar-thin flex-1 flex flex-col justify-between">
                <div>
                  <div className="mb-3">
                    <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[11px] font-bold text-cyan-600 dark:text-cyan-300">
                      create-taserjs
                    </span>
                    <span className="ml-2 text-fd-muted-foreground text-[11px]">v0.0.1</span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-fd-muted-foreground">
                      <span className="text-cyan-500">◇</span>
                      <span>Project name</span>
                    </div>
                    <div className="border-l-2 border-fd-border/70 pl-4 text-fd-foreground font-semibold">
                      my-app
                    </div>
                  </div>

                  <TerminalStep
                    label="Base framework"
                    options={FRAMEWORKS}
                    value={framework}
                    tone="orange"
                  />
                  {resolved.template && (
                    <TerminalStep
                      label="Vite template"
                      options={TEMPLATES}
                      value={resolved.template}
                      tone="orange"
                    />
                  )}
                  {resolved.framework.supportsHost && (
                    <TerminalStep
                      label="Existing server"
                      options={HOSTS}
                      value={resolved.host ?? "none"}
                      tone="cyan"
                    />
                  )}
                  {resolved.preset && (
                    <TerminalStep
                      label="Deployment"
                      options={PRESETS}
                      value={resolved.preset}
                      tone="amber"
                    />
                  )}
                  <TerminalStep label="Database" options={DATABASES} value={db} tone="sky" />
                  {db !== "none" && (
                    <TerminalStep
                      label="Database driver"
                      options={DRIVERS}
                      value={driver}
                      tone="neutral"
                    />
                  )}
                  <TerminalStep label="Logger" options={LOGGERS} value={logger} tone="purple" />
                  <TerminalStep
                    label="Validator"
                    options={VALIDATORS}
                    value={validator}
                    tone="emerald"
                  />
                </div>

                <div className="mt-4 pt-3 border-t border-fd-border/60 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>✔</span>
                    <span>Scaffolded ./my-app successfully!</span>
                  </div>
                  <div className="text-fd-muted-foreground pl-4 text-[11px]">
                    Created{" "}
                    <span className="text-fd-foreground font-medium">
                      {resolved.framework.label}
                    </span>{" "}
                    project
                    {resolved.host && (
                      <>
                        {" "}
                        on{" "}
                        <span className="text-fd-foreground font-medium">
                          {labelOf(HOSTS, resolved.host)}
                        </span>
                      </>
                    )}
                    , deploying{" "}
                    <span className="text-fd-foreground font-medium">
                      {resolved.preset
                        ? labelOf(PRESETS, resolved.preset)
                        : "through its own adapter"}
                    </span>{" "}
                    with{" "}
                    {db !== "none" ? (
                      <span className="text-fd-foreground font-medium">
                        {labelOf(DATABASES, db)} ({labelOf(DRIVERS, driver)})
                      </span>
                    ) : (
                      "no database"
                    )}
                    ,{" "}
                    <span className="text-fd-foreground font-medium">
                      {labelOf(VALIDATORS, validator)}
                    </span>{" "}
                    validation, and{" "}
                    {logger !== "none" ? (
                      <span className="text-fd-foreground font-medium">
                        {labelOf(LOGGERS, logger)}
                      </span>
                    ) : (
                      "console"
                    )}{" "}
                    logging.
                  </div>
                </div>
              </div>
            </WindowFrame>
          </div>

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

                <ChipGroup
                  label="Base Framework"
                  options={FRAMEWORKS}
                  value={framework}
                  tone="orange"
                  onChange={setFramework}
                />

                {resolved.template && (
                  <ChipGroup
                    label="Vite Template"
                    options={TEMPLATES}
                    value={resolved.template}
                    tone="orange"
                    onChange={setTemplate}
                  />
                )}

                {resolved.framework.supportsHost && (
                  <ChipGroup
                    label="Host Server"
                    options={HOSTS}
                    value={resolved.host ?? "none"}
                    tone="cyan"
                    onChange={setHost}
                    disabled={cloudflareSelected ? nodeOnlyHosts : []}
                  />
                )}

                {resolved.preset && (
                  <ChipGroup
                    label="Deployment"
                    options={PRESETS}
                    value={resolved.preset}
                    tone="amber"
                    onChange={setPreset}
                  />
                )}

                <div>
                  <ChipGroup
                    label="Database ORM"
                    options={DATABASES}
                    value={db}
                    tone="sky"
                    onChange={setDb}
                  />
                  {db !== "none" && (
                    <div className="mt-3 pl-3 border-l-2 border-fd-border/70">
                      <ChipGroup
                        label="Driver"
                        options={DRIVERS}
                        value={driver}
                        tone="neutral"
                        onChange={setDriver}
                        small
                      />
                    </div>
                  )}
                </div>

                <ChipGroup
                  label="Logger"
                  options={LOGGERS}
                  value={logger}
                  tone="purple"
                  onChange={setLogger}
                />

                <ChipGroup
                  label="Validator"
                  options={VALIDATORS}
                  value={validator}
                  tone="emerald"
                  onChange={setValidator}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-fd-border bg-fd-card p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-fd-foreground uppercase tracking-wider">
              One-Liner Command
            </span>
            <div className="flex items-center gap-1">
              {PACKAGE_MANAGERS.map((manager) => (
                <button
                  key={manager.id}
                  type="button"
                  onClick={() => setPackageManager(manager.id)}
                  className={cn(
                    "rounded px-2.5 py-0.5 font-mono text-[11px] font-medium transition-colors cursor-pointer",
                    packageManager === manager.id
                      ? "bg-fd-primary text-fd-primary-foreground font-semibold"
                      : "text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-muted",
                  )}
                >
                  {manager.id}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-between rounded-xl border border-fd-border bg-fd-muted/40 p-3 font-mono text-xs text-fd-foreground">
            <span className="truncate pr-8 select-all">{command}</span>
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

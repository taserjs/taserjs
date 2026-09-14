"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Database,
  Layers,
  ShieldCheck,
  Code2,
  CheckCircle2,
  Send,
  ArrowDown,
  Sparkles,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface FlowStep {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "blue" | "emerald" | "violet" | "amber" | "rose" | "indigo" | "sky";
  description: string;
  details: {
    label: string;
    value: string;
  }[];
  codeSnippet?: {
    filename: string;
    code: string;
  };
}

const FLOW_STEPS: FlowStep[] = [
  {
    id: "runtime",
    number: 1,
    title: "TaserApp Dispatch",
    subtitle: "Generated manifest, Hono-backed app.fetch(Request)",
    icon: Globe,
    tone: "blue",
    description:
      "@taserjs/plugin and @taserjs/cli emit a static route manifest into routes.gen.ts. createTaserApp() registers composed handlers on a Hono TaserApp once; each request is served via the Web fetch API with no filesystem routing at runtime.",
    details: [
      { label: "Generated Entry", value: "src/.taserjs/routes.gen.ts exports app and AppManifest" },
      {
        label: "Host Integration",
        value:
          "Standalone Vite/Nitro, Next.js plugin, or host pass-through (Express, Fastify, Hono)",
      },
      { label: "Dispatch", value: "await app.fetch(request) → Web Standard Response" },
    ],
    codeSnippet: {
      filename: "src/.taserjs/routes.gen.ts",
      code: `// createTaserApp(routeManifest, taser) at build time\nexport const app = /* Hono TaserApp */\n\n// Per request (any host):\nconst response = await app.fetch(request)`,
    },
  },
  {
    id: "context",
    number: 2,
    title: "Application Context (ctx)",
    subtitle: "defineTaser() + createContext() boot & request services",
    icon: Database,
    tone: "indigo",
    description:
      "TaserDefinition from defineTaser() attaches createContext() boot singletons (db, logger) and per-request fields (requestId). The runtime merges them into ctx for every composed handler.",
    details: [
      { label: "Boot Scope", value: "Evaluated once at startup — pools, clients, config" },
      { label: "Request Scope", value: "Evaluated per request — IDs, tracing, tenancy" },
      { label: "Services on ctx", value: "ctx.db, ctx.requestId inferred from taser.ts" },
    ],
    codeSnippet: {
      filename: "src/taser.ts",
      code: `export const context = createContext({\n  boot: () => ({ db: createDb(), logger: pino() }),\n  request: () => ({ requestId: crypto.randomUUID() }),\n})\n\nexport default defineTaser()\n  .context(context)`,
    },
  },
  {
    id: "middleware",
    number: 3,
    title: "Layout Middleware Onion",
    subtitle: "Segment layouts → nested folders → pathless groups",
    icon: Layers,
    tone: "violet",
    description:
      "Each layout file exports t.layout(id).use(...). The composed handler walks the layout hierarchy outer-to-inner. Serializable data from next({ ... }) merges into state; cookie jars and similar helpers use next.provide() as handler siblings.",
    details: [
      {
        label: "Execution Order",
        value: "Ancestor layouts → descendant layouts → route middleware",
      },
      {
        label: "State Facet",
        value: "next({ user }) accumulates on state for downstream handlers",
      },
      { label: "Early Exits", value: "unauthorized(), forbidden(), etc. before validation" },
    ],
    codeSnippet: {
      filename: "src/routes/dashboard.ts",
      code: `export default t.layout("/dashboard").use(async (ctx, next) => {\n  const user = await getSessionUser(ctx.headers.get("cookie"))\n  if (!user) return unauthorized({ message: "Sign in required" })\n  return next({ user })\n})`,
    },
  },
  {
    id: "validation",
    number: 4,
    title: "Standard Schema Validation",
    subtitle: "req.params, req.query, req.body on the Request facet",
    icon: ShieldCheck,
    tone: "amber",
    description:
      "After layouts, the route pipeline validates declared schemas (Zod, ArkType, Valibot, any Standard Schema). Validated inputs land on req; failures throw ValidationError → 422 JSON.",
    details: [
      { label: "Validation Spec", value: "@standard-schema/spec — library-agnostic" },
      {
        label: "Request Facet",
        value: "req.params, req.query, req.body (headers stay raw on req.headers)",
      },
      {
        label: "Error Handling",
        value: "Structured 422 envelope (bypasses defineTaser().onError())",
      },
    ],
    codeSnippet: {
      filename: "src/routes/users/$id.get.ts",
      code: `const GET = t.get("/users/:id")\n  .params(z.object({ id: z.string().uuid() }))\n  .query(z.object({ details: z.coerce.boolean().default(false) }))`,
    },
  },
  {
    id: "handler",
    number: 5,
    title: "Terminal Handler",
    subtitle: "Facet-split { req, ctx, state, ...services }",
    icon: Code2,
    tone: "sky",
    description:
      "Business logic runs in the terminal handler. HTTP inputs live on req, application services on ctx, cascaded layout data on state, and provided middleware services (e.g. cookies) as top-level siblings.",
    details: [
      {
        label: "Handler Args",
        value: "{ req, ctx, state, cookies, ... } — no flattened ctx.params",
      },
      {
        label: "Type Inference",
        value: "LayoutHierarchy + route builder infer state and req shapes",
      },
      { label: "Reply Helpers", value: "json(), notFound(), stream helpers return Web Response" },
    ],
    codeSnippet: {
      filename: "src/routes/users/$id.get.ts",
      code: `export default GET.handler(async ({ req, ctx, state }) => {\n  // req.params.id — UUID\n  // state.user — from /users layout\n  const user = await ctx.db.findUser(req.params.id)\n  return json(user)\n})`,
    },
  },
  {
    id: "contracts",
    number: 6,
    title: "Response Contracts",
    subtitle: ".returns() compile-time checks + optional dev validation",
    icon: CheckCircle2,
    tone: "emerald",
    description:
      ".returns({ 200: schema, 404: schema }) enforces handler return shapes at compile time. In non-production, the runtime may validate outgoing payloads against the status schema when response.validate is enabled.",
    details: [
      { label: "Static Checks", value: "TS errors when status or body shape drifts" },
      {
        label: "Runtime (dev)",
        value: "ResponseValidationError on mismatch when validation is on",
      },
      {
        label: "Client Typing",
        value: "Status-keyed outputs flow into AppManifest for @taserjs/client",
      },
    ],
    codeSnippet: {
      filename: "src/routes/users/$id.get.ts",
      code: `const GET = t.get("/users/:id").returns({\n  200: z.object({ id: z.string(), name: z.string() }),\n  404: z.object({ message: z.string() }),\n})`,
    },
  },
  {
    id: "response",
    number: 7,
    title: "Response & Typed Client",
    subtitle: "Web Response out, createClient<AppManifest> in",
    icon: Send,
    tone: "rose",
    description:
      "Hono returns the Web Response to the host. Frontends import AppManifest from the same routes.gen.ts and call endpoints with createClient — proxy methods mirror filesystem routes with param/query/body typing.",
    details: [
      { label: "Reply Helpers", value: "json(), created(), redirect(), pipe(), sse()" },
      { label: "Cookie Jar", value: "cookie() layout middleware → cookies in handler args" },
      { label: "Client SDK", value: "client.users._id.$get({ param: { id } }) with inferred JSON" },
    ],
    codeSnippet: {
      filename: "src/client.ts",
      code: `import { createClient } from "@taserjs/client"\nimport type { AppManifest } from "./.taserjs/routes.gen"\n\nconst client = createClient<AppManifest>({ baseUrl: "/api" })\nconst res = await client.users._id.$get({ param: { id: "usr_1" } })`,
    },
  },
];

const toneStyles = {
  blue: {
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    activeCard: "border-blue-500/60 bg-blue-500/[0.04] dark:bg-blue-950/20 shadow-blue-500/5",
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  indigo: {
    badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    activeCard:
      "border-indigo-500/60 bg-indigo-500/[0.04] dark:bg-indigo-950/20 shadow-indigo-500/5",
    iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    dot: "bg-indigo-500",
  },
  violet: {
    badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    activeCard:
      "border-violet-500/60 bg-violet-500/[0.04] dark:bg-violet-950/20 shadow-violet-500/5",
    iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  amber: {
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    activeCard: "border-amber-500/60 bg-amber-500/[0.04] dark:bg-amber-950/20 shadow-amber-500/5",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  sky: {
    badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    activeCard: "border-sky-500/60 bg-sky-500/[0.04] dark:bg-sky-950/20 shadow-sky-500/5",
    iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  emerald: {
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    activeCard:
      "border-emerald-500/60 bg-emerald-500/[0.04] dark:bg-emerald-950/20 shadow-emerald-500/5",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  rose: {
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    activeCard: "border-rose-500/60 bg-rose-500/[0.04] dark:bg-rose-950/20 shadow-rose-500/5",
    iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

export function RequestFlowDiagram() {
  const [selectedStepId, setSelectedStepId] = useState<string>("runtime");

  const currentStep = FLOW_STEPS.find((s) => s.id === selectedStepId) ?? FLOW_STEPS[0];
  const currentTone = toneStyles[currentStep.tone];

  return (
    <div className="not-prose my-8 overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-sm">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-fd-border bg-fd-muted/40 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-fd-primary/10 text-fd-primary">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-fd-foreground">
              Taser.js Request Execution Pipeline
            </h4>
            <p className="text-xs text-fd-muted-foreground">
              Click any stage to inspect lifecycle execution, data flow, and type inference
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSelectedStepId("runtime")}
          className="flex items-center gap-1.5 rounded-md border border-fd-border bg-fd-card px-2.5 py-1 text-xs font-medium text-fd-muted-foreground transition hover:bg-fd-accent hover:text-fd-foreground"
        >
          <RotateCcw className="size-3.5" />
          Reset Flow
        </button>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-12">
        {/* Left Column: Timeline Step List */}
        <div className="border-b border-fd-border p-4 lg:col-span-5 lg:border-r lg:border-b-0 space-y-1.5">
          {FLOW_STEPS.map((step, index) => {
            const isSelected = step.id === selectedStepId;
            const Icon = step.icon;
            const style = toneStyles[step.tone];

            return (
              <div key={step.id} className="relative">
                <button
                  type="button"
                  onClick={() => setSelectedStepId(step.id)}
                  className={cn(
                    "group relative flex w-full items-start gap-3 rounded-lg border p-2.5 text-left transition-all",
                    isSelected
                      ? cn("border-l-4 shadow-sm", style.activeCard)
                      : "border-transparent bg-transparent hover:bg-fd-muted/50 hover:border-fd-border/50",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
                      isSelected
                        ? style.iconBg
                        : "bg-fd-muted text-fd-muted-foreground group-hover:text-fd-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-fd-muted-foreground">
                        0{step.number}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-semibold truncate",
                          isSelected
                            ? "text-fd-foreground"
                            : "text-fd-muted-foreground group-hover:text-fd-foreground",
                        )}
                      >
                        {step.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-fd-muted-foreground truncate">{step.subtitle}</p>
                  </div>
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 transition-transform",
                      isSelected
                        ? "rotate-90 text-fd-foreground"
                        : "opacity-0 group-hover:opacity-60",
                    )}
                  />
                </button>

                {index < FLOW_STEPS.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="size-3 text-fd-muted-foreground/30" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column: Step Detail Card */}
        <div className="flex flex-col justify-between p-5 lg:col-span-7 bg-fd-card/50">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {/* Step Header */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      currentTone.badge,
                    )}
                  >
                    Stage 0{currentStep.number}
                  </span>
                  <span className="text-xs text-fd-muted-foreground font-mono">
                    {currentStep.id.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-bold tracking-tight text-fd-foreground">
                  {currentStep.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-fd-muted-foreground">
                  {currentStep.description}
                </p>
              </div>

              {/* Step Properties Table */}
              <div className="rounded-lg border border-fd-border bg-fd-muted/30 p-3 space-y-2">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-fd-muted-foreground">
                  Execution Highlights
                </h5>
                <div className="space-y-1.5 text-xs">
                  {currentStep.details.map((item) => (
                    <div key={item.label} className="flex items-start gap-2">
                      <div
                        className={cn("size-1.5 mt-1.5 shrink-0 rounded-full", currentTone.dot)}
                      />
                      <div>
                        <span className="font-medium text-fd-foreground">{item.label}: </span>
                        <span className="text-fd-muted-foreground">{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code Snippet Preview */}
              {currentStep.codeSnippet && (
                <div className="overflow-hidden rounded-lg border border-fd-border bg-neutral-950 text-neutral-100 dark:bg-neutral-900">
                  <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/80 px-3 py-1.5 text-[11px] font-mono text-neutral-400">
                    <span>{currentStep.codeSnippet.filename}</span>
                    <span className="text-[10px] uppercase text-neutral-500">TypeScript</span>
                  </div>
                  <pre className="overflow-x-auto p-3 text-xs leading-relaxed font-mono">
                    <code>{currentStep.codeSnippet.code}</code>
                  </pre>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Bottom Step Navigation */}
          <div className="mt-6 flex items-center justify-between border-t border-fd-border pt-4 text-xs">
            <button
              type="button"
              disabled={currentStep.number === 1}
              onClick={() => {
                const prevIndex = currentStep.number - 2;
                if (prevIndex >= 0) setSelectedStepId(FLOW_STEPS[prevIndex].id);
              }}
              className="rounded-md border border-fd-border bg-fd-card px-3 py-1.5 font-medium transition hover:bg-fd-accent disabled:opacity-40"
            >
              ← Previous Stage
            </button>
            <span className="text-xs text-fd-muted-foreground font-mono">
              {currentStep.number} of {FLOW_STEPS.length}
            </span>
            <button
              type="button"
              disabled={currentStep.number === FLOW_STEPS.length}
              onClick={() => {
                const nextIndex = currentStep.number;
                if (nextIndex < FLOW_STEPS.length) setSelectedStepId(FLOW_STEPS[nextIndex].id);
              }}
              className="rounded-md border border-fd-border bg-fd-card px-3 py-1.5 font-medium transition hover:bg-fd-accent disabled:opacity-40"
            >
              Next Stage →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    title: "Runtime & Platform Resolution",
    subtitle: "Vite Standalone, Nitro Presets, Next.js, or Host Frameworks",
    icon: Globe,
    tone: "blue",
    description:
      "The incoming HTTP request is received by the platform runtime and dispatched into Taser's radix tree via a Web Standard Request object.",
    details: [
      { label: "Dispatch Mechanism", value: "Web Standard Request / Response interface" },
      { label: "Supported Runtimes", value: "Vite Dev / Prod, Nitro Presets, Next.js App Router, Express, Fastify, Fetch hosts" },
      { label: "Virtual Routing", value: "Compiled static manifest with zero filesystem lookups at runtime" },
    ],
    codeSnippet: {
      filename: "server.ts",
      code: `// Taser receives Web Standard Request\nconst response = await taserApp.fetch(request);`,
    },
  },
  {
    id: "context",
    number: 2,
    title: "Dual Context Initialization",
    subtitle: "Boot Singletons + Request-Scoped Metadata",
    icon: Database,
    tone: "indigo",
    description:
      "Taser merges boot singletons (database connection pools, Redis clients) and computes request metadata (unique requestId, timing headers) with full static typing.",
    details: [
      { label: "Boot Scope", value: "Evaluated once on server start (singletons)" },
      { label: "Request Scope", value: "Evaluated per incoming request (headers, IDs)" },
      { label: "Type Safety", value: "Inferred globally into ctx without manual casting" },
    ],
    codeSnippet: {
      filename: "src/context.ts",
      code: `export const context = createContext({\n  boot: () => ({ db: createDatabasePool() }),\n  request: () => ({ requestId: crypto.randomUUID() }),\n});`,
    },
  },
  {
    id: "middleware",
    number: 3,
    title: "Cascading Layout Middleware",
    subtitle: "Root $.ts and Nested Folder Pipelines",
    icon: Layers,
    tone: "violet",
    description:
      "Middleware executes down the directory hierarchy. State returned by middleware pipelines merges seamlessly into ctx.state for child handlers.",
    details: [
      { label: "Execution Flow", value: "Outermost (Root $.ts) → Nested Folder → Pathless Layouts" },
      { label: "State Injection", value: "Type-safe next({ user, session }) enrichment" },
      { label: "Early Exits", value: "Guards and auth filters can short-circuit before handler" },
    ],
    codeSnippet: {
      filename: "src/routes/admin/$.ts",
      code: `export const Middleware = t.middleware("/admin/$").use(async (ctx, next) => {\n  const session = await verifyAuth(ctx.req);\n  return next({ user: session.user }); // Merges into ctx.state\n});`,
    },
  },
  {
    id: "validation",
    number: 4,
    title: "Standard Schema Validation",
    subtitle: "Params, Query, Headers & Body Schema Enforcement",
    icon: ShieldCheck,
    tone: "amber",
    description:
      "Incoming request data is validated against declared schemas (Zod, ArkType, Valibot). Invalid inputs raise a structured ValidationError.",
    details: [
      { label: "Validation Spec", value: "Universal Standard Schema spec support" },
      { label: "Input Targets", value: "params ($id), query, headers, JSON body, FormData" },
      { label: "Error Handling", value: "Auto-formats into 422 Unprocessable Entity payload" },
    ],
    codeSnippet: {
      filename: "src/routes/users/$id.get.ts",
      code: `const GET = t.get("/users/:id")\n  .params(z.object({ id: z.string().uuid() }))\n  .query(z.object({ details: z.coerce.boolean().default(false) }));`,
    },
  },
  {
    id: "handler",
    number: 5,
    title: "Route Handler Execution",
    subtitle: "Type-Safe ctx Execution with Zero Casting",
    icon: Code2,
    tone: "sky",
    description:
      "The business logic runs inside the handler. ctx contains all inferred path params, query fields, validated body, and injected layout state.",
    details: [
      { label: "Inferred Context", value: "typeof GET.$Infer.Context provides exact types" },
      { label: "Fluent or Options", value: "Supports chaining .handler() or { handle } syntax" },
      { label: "Async / Sync", value: "Native async/await with automatic error bubbling" },
    ],
    codeSnippet: {
      filename: "src/routes/users/$id.get.ts",
      code: `export const Route = GET.handler(async (ctx) => {\n  // ctx.params.id is string (UUID)\n  // ctx.state.user is User from middleware\n  const user = await ctx.db.find(ctx.params.id);\n  return json(user);\n});`,
    },
  },
  {
    id: "contracts",
    number: 6,
    title: "Response Contract Verification",
    subtitle: "Compile-Time Return Checks & Schema Validation",
    icon: CheckCircle2,
    tone: "emerald",
    description:
      "The TypeScript compiler ensures handler return shapes match declared .returns() status schemas, preventing API response drift.",
    details: [
      { label: "Static Checks", value: "Compile-time error if returned status or shape differs" },
      { label: "Runtime Validation", value: "Optional production runtime response sanitization" },
      { label: "Discriminated Unions", value: "Exposes status-keyed payloads for typed client" },
    ],
    codeSnippet: {
      filename: "src/routes/users/$id.get.ts",
      code: `const GET = t.get("/users/:id").returns({\n  200: z.object({ id: z.string(), name: z.string() }),\n  404: z.object({ message: z.string() }),\n});`,
    },
  },
  {
    id: "response",
    number: 7,
    title: "Typed Response & Client Parity",
    subtitle: "Status-Discriminated Output & Zero-Drift SDK",
    icon: Send,
    tone: "rose",
    description:
      "Tree-shakeable reply helpers serialize JSON, set cookies, or stream SSE chunks, while frontend clients consume the endpoint with 1:1 type inference.",
    details: [
      { label: "Reply Helpers", value: "json(), ok(), notFound(), redirect(), stream.pipe()" },
      { label: "Cookie Management", value: "ctx.cookies with HMAC signing and encryption" },
      { label: "Typed Client SDK", value: "client.users({ id }).get() narrowing by status" },
    ],
    codeSnippet: {
      filename: "client.ts",
      code: `const res = await client.users({ id: "123" }).get();\nif (res.status === 200) {\n  console.log(res.data.name); // Typed User!\n}`,
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
    activeCard: "border-indigo-500/60 bg-indigo-500/[0.04] dark:bg-indigo-950/20 shadow-indigo-500/5",
    iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    dot: "bg-indigo-500",
  },
  violet: {
    badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    activeCard: "border-violet-500/60 bg-violet-500/[0.04] dark:bg-violet-950/20 shadow-violet-500/5",
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
    activeCard: "border-emerald-500/60 bg-emerald-500/[0.04] dark:bg-emerald-950/20 shadow-emerald-500/5",
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
              Taser Request Execution Pipeline
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
                      : "border-transparent bg-transparent hover:bg-fd-muted/50 hover:border-fd-border/50"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
                      isSelected ? style.iconBg : "bg-fd-muted text-fd-muted-foreground group-hover:text-fd-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-fd-muted-foreground">0{step.number}</span>
                      <span
                        className={cn(
                          "text-xs font-semibold truncate",
                          isSelected ? "text-fd-foreground" : "text-fd-muted-foreground group-hover:text-fd-foreground"
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
                      isSelected ? "rotate-90 text-fd-foreground" : "opacity-0 group-hover:opacity-60"
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
                      currentTone.badge
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
                      <div className={cn("size-1.5 mt-1.5 shrink-0 rounded-full", currentTone.dot)} />
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

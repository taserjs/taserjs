"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, FileCode, Layers, ShieldCheck, Waypoints } from "lucide-react";
import { cn } from "@/lib/cn";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { SectionAccent, SectionHeader } from "./section-header";
import { SectionSeparator } from "./section-separator";
import { WindowFrame } from "./window-frame";

interface TabData {
  id: string;
  label: string;
  icon: typeof Layers;
  problemTitle: string;
  problemBadge: string;
  problemCode: string;
  problemFilename: string;
  solutionTitle: string;
  solutionBadge: string;
  solutionCode: string;
  solutionFilename: string;
  takeaway: string;
}

const tabs: TabData[] = [
  {
    id: "context",
    label: "Middleware & Context",
    icon: Layers,
    problemTitle: "The Type Assertion Trap",
    problemBadge: "Type Casting Required",
    problemFilename: "server.ts",
    problemCode: `// Middleware attaches data to req
app.use((req, res, next) => {
  req.user = getUser(req); // untyped assignment
  next();
});

// Downstream handler has NO type inference
app.post("/private", validateBody(schema), (req, res) => {
  const user = req.user as User;       // ⚠️ manual typecast
  const body = req.body as PostBody;   // ⚠️ manual typecast
  const query = req.query as Query;    // ⚠️ manual typecast
  res.send({ ok: true });
});`,
    solutionTitle: "Cascading Typed Pipeline",
    solutionBadge: "100% Inferred Context",
    solutionFilename: "routes/admin.ts + routes/admin/reports.post.ts",
    solutionCode: `// Middleware validates and passes state to next()
export default t.layout("/admin/*").use(async (ctx, next) => {
  const token = ctx.headers.get("authorization");
  const user = await verifyUser(token);
  if (!user) throw new Error("Unauthorized");
  return next({ user }); // Merges into ctx.state
});

// Handler receives fully-inferred ctx automatically
const POST = t.post("/admin/reports").body(ReportInputSchema);

export default POST.handler(async (ctx) => {
  const user = ctx.state.user; // ✓ Inferred User from next({ user })
  const body = ctx.body;       // ✓ Inferred ReportInput
  return json({ created: true, by: user.id });
});`,
    takeaway:
      "In Taser, middleware return state flows directly into ctx.state with zero typecasting or Express global interface hacks.",
  },
  {
    id: "discovery",
    label: "Route Discoverability",
    icon: FileCode,
    problemTitle: "Scattered Handlers & Manual Wiring",
    problemBadge: "Spaghetti Wiring",
    problemFilename: "src/routes/index.ts",
    problemCode: `// Handlers scattered in random directories:
// - src/handlers/save-private-handler.ts
// - src/controllers/reportsController.ts
// - src/api/v2/adminOps.ts

// Must be wired manually with correct prefix & ordering
app.use("/api/v1/admin", authMiddleware, adminRouter);
adminRouter.post("/reports/export", exportHandler);
adminRouter.get("/reports/:id", getReportHandler);
// ⚠️ Easy to register in wrong order or miss auth!`,
    solutionTitle: "Deterministic File-Based Routing",
    solutionBadge: "Zero Manual Tables",
    solutionFilename: "src/routes",
    solutionCode: `// Directory paths match API endpoints automatically:
//
// src/routes/
// ├── $.ts                      -> Root Middleware
// ├── admin.ts                   -> Scoped /admin/* Middleware
// └── admin/
//     ├── reports.ts              -> Scoped /admin/reports/* Middleware
//     └── reports/
//         ├── index.get.ts      -> GET  /admin/reports
//         ├── index.post.ts    -> POST /admin/reports
//         └── $id.get.ts        -> GET  /admin/reports/:id
//
// ✓ Discovered and type-checked on save by CLI watch`,
    takeaway:
      "File paths reflect your actual API endpoints. Middlewares scope cleanly to their folder without manual router registries.",
  },
  {
    id: "returns",
    label: "Response Safety",
    icon: ShieldCheck,
    problemTitle: "Silent Response Drift",
    problemBadge: "Unchecked res.json()",
    problemFilename: "controllers/report.ts",
    problemCode: `app.get("/admin/reports", async (req, res) => {
  const reports = await db.reports.findMany();

  // ⚠️ Nobody knows what shape this must match.
  // If the database schema or helper return changes,
  // response drifts silently and breaks production clients!
  res.json({ data: reports });
});`,
    solutionTitle: "Compiler-Enforced Contracts",
    solutionBadge: "Build-Time Return Check",
    solutionFilename: "routes/admin/reports.get.ts",
    solutionCode: `export default t.get("/admin/reports")
  .returns({
    200: z.object({
      reports: z.array(ReportSchema),
      total: z.number(),
    }),
    404: z.object({ error: z.string() }),
  })
  .handler(async (ctx) => {
    const data = await getReports();
    // ✓ Type-checked: Compiler errors if return shape doesn't match!
    return json({ reports: data.items, total: data.count });
  });`,
    takeaway:
      "Taser catches response schema breakages at compile time before your code ever deploys to staging or production.",
  },
  {
    id: "client",
    label: "Client SDK",
    icon: Waypoints,
    problemTitle: "Blind Handwritten Fetch",
    problemBadge: "Untyped Guesswork",
    problemFilename: "frontend/api.ts",
    problemCode: `// Frontend client writes untyped fetch & guesses schema
const res = await fetch("/api/admin/reports?limit=10", {
  method: "POST",
  body: JSON.stringify({ format: "pdf" }),
});

const data = await res.json();
// ⚠️ 'data' is any. No autocomplete, no URL check,
// no query param validation, and no refactor safety!`,
    solutionTitle: "End-to-End Typed Client",
    solutionBadge: "Type-Inferred SDK",
    solutionFilename: "frontend/client.ts",
    solutionCode: `import { createClient } from "@taserjs/router-client";
import type { RouteManifest } from "../.taser/types/routes.js";

// End-to-end typed client derived directly from your server RouteManifest
const api = createClient<RouteManifest>({ baseUrl: "https://api.example.com" });

// ✓ Full autocomplete for routes, query, params, and response:
const res = await api.admin.reports.$get({
  query: { limit: 10 },
});

if (res.ok) {
  const data = await res.json();
  // ✓ data.reports is 100% typed with zero manual casting!
}`,
    takeaway:
      "Export your router types and call your backend with a typed client proxy that guarantees 1:1 parity with your server.",
  },
];

export function ProblemSolutionTabs() {
  const [activeTabId, setActiveTabId] = useState("context");
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  return (
    <section id="why-taser" className="relative bg-fd-muted/20 scroll-mt-14">
      <SectionSeparator />
      <div className="mx-auto max-w-(--fd-layout-width) px-6 py-16 md:py-24">
        <SectionHeader
          align="center"
          eyebrow="The Problem & Solution"
          title={
            <>
              Why traditional Node.js routing <SectionAccent>breaks at scale</SectionAccent>
            </>
          }
          description="Traditional routers force trade-offs between clean folder structures and real type safety. Taser eliminates the type assertion trap and guarantees runtime correctness from middleware to client."
        />

        {/* Tab Switcher */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium transition-all duration-200 cursor-pointer",
                  isActive
                    ? "border-orange-500/40 bg-fd-card text-fd-foreground shadow-md shadow-orange-500/5 ring-1 ring-orange-500/30"
                    : "border-fd-border bg-fd-muted/30 text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-4",
                    isActive ? "text-orange-500" : "text-fd-muted-foreground",
                  )}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dual Code Window */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Traditional API Card (The Problem) */}
          <WindowFrame
            title="Traditional API (Express / Fastify)"
            tone="rose"
            badge={
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                <AlertCircle className="size-3" />
                {activeTab.problemBadge}
              </span>
            }
          >
            <div className="hero-code-block text-xs">
              <DynamicCodeBlock
                code={activeTab.problemCode}
                lang="ts"
                codeblock={{
                  title: activeTab.problemFilename,
                  className: "!my-0 !rounded-none !border-0 !shadow-none !bg-transparent",
                  style: { width: "100%", fontSize: "12px" },
                }}
              />
            </div>
          </WindowFrame>

          {/* Taser Card (The Solution) */}
          <WindowFrame
            title="Taser Router"
            tone="emerald"
            badge={
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3" />
                {activeTab.solutionBadge}
              </span>
            }
          >
            <div className="hero-code-block text-xs">
              <DynamicCodeBlock
                code={activeTab.solutionCode}
                lang="ts"
                codeblock={{
                  title: activeTab.solutionFilename,
                  className: "!my-0 !rounded-none !border-0 !shadow-none !bg-transparent",
                  style: { width: "100%", fontSize: "12px" },
                }}
              />
            </div>
          </WindowFrame>
        </div>

        {/* Bottom Takeaway Bar */}
        <div className="mt-6 rounded-xl border border-fd-border bg-fd-muted/30 p-4 text-center text-xs text-fd-muted-foreground">
          <span className="font-semibold text-fd-foreground">Key Takeaway: </span>
          {activeTab.takeaway}
        </div>
      </div>
    </section>
  );
}

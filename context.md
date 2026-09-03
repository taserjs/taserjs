# Taser Architecture & Codebase Context

## 1. Overview & Purpose

**Taser** is a type-safe, file-based routing framework for backend HTTP APIs in TypeScript. It brings the intuitive routing, layout hierarchies, and type inference model of modern frontend routers (like TanStack Router) to backend server runtimes.

### Key Philosophy

- **Deterministic File-Based Routing**: Route endpoints are defined by HTTP verb files (`.get.ts`, `.post.ts`, `.put.ts`, `.delete.ts`, etc.). Layout and middleware definitions are defined hierarchically using non-verb files (e.g. `src/routes/$.ts` or `src/routes/admin.ts`).
- **Cascading Strongly-Typed Context**: Middleware passes state down the pipeline via `next({ key: value })`, automatically merged and typed on downstream handlers in `ctx.state` with zero runtime overhead and no manual type assertions (`req.user as User`).
- **Standard Schema First**: Natively supports any validator implementing the `@standard-schema/spec` (Zod, ArkType, Valibot, Typia, etc.).
- **Compile-Time Return Contracts** (optional): `.returns({ 200: UserSchema, 401: ErrorSchema })` verifies handler returns against schemas at compile time and enables runtime response validation.
- **Framework & Runtime Agnostic**: Runs standalone on Node.js, Bun, Cloudflare Workers, or mounts directly onto Hono, Express, Fastify, Nitro, and Next.js.
- **Zero-Drift Typed Client**: `@taserjs/router-client` infers end-to-end types from route handlers automatically; optional `.returns()` schemas override success payload inference when defined.

---

## 2. Monorepo Structure

```
taserjs/
├── packages/
│   ├── router/            # Public entry point, standalone builders (t.get, t.layout, t.middleware), types
│   ├── router-core/       # Runtime onion execution pipeline, context, headers, cookies, layers, Hono adapter
│   ├── router-utils/      # Standard Schema validation, reply helpers (json, text, html), status codes, manifest helpers
│   ├── router-generator/  # Route scanner, AST parser, watcher, type generator (.taser/types/routes.d.ts), scaffolder
│   ├── router-plugin/     # Unplugin multi-bundler plugin (Vite, Nitro, Next.js, Rollup, Webpack, Rspack, Esbuild)
│   ├── router-client/     # Lightweight typed RPC client proxy
│   ├── router-cli/        # Command-line interface (taser dev, taser build, taser generate, taser scaffold)
│   └── create-taserjs/    # CLI starter template generator
├── docs/                  # Next.js 16 + Turbopack documentation application
└── examples/              # Integration examples (basic-app, bun-app, hono-app, manual-app, next-app, start-app)
```

---

## 3. Core Concepts & Architecture

### 3.1 `src/taser.ts` & Ambient AppContext

A Taser application initializes a root runtime via `createTaserApp` in `src/taser.ts` and exports it as `default`:

```ts
import { createContext, createTaserApp } from "@taserjs/router";

export const context = createContext({
  boot: () => ({ db: new Database() }),
  request: (req) => ({ requestId: crypto.randomUUID() }),
});

export default createTaserApp({
  response: { validate: true },
}).context(context);
```

- When `@taserjs/router-generator` runs, it generates `.taser/types/routes.d.ts` which augments `@taserjs/router`'s split interfaces:
  ```ts
  declare module "@taserjs/router" {
    interface RouterRegister {
      AppContext: typeof taser.$Infer.Context;
      RoutePath: RoutePathGen;
      LayoutId: LayoutIdGen;
      LayoutTree: LayoutTreeGen;
    }

    interface RouterMiddlewaresRegister {
      LayoutMiddlewares: LayoutMiddlewaresGen;
    }

    interface RouterRoutesRegister {
      RouteByPathMethod: RouteByPathMethodGen;
    }
  }
  ```
- All route and middleware files import directly from `@taserjs/router` (e.g. `import { t } from "@taserjs/router"`). Builders resolve `AppContext` ambiently from `RouterRegister`, eliminating the need for path aliases (like `#taserjs/router`).

---

### 3.2 Defining Routes (`t.get`, `t.post`, etc.)

Routes export a builder chain as `default`:

```ts
import { json, t } from "@taserjs/router";
import { z } from "zod";

export default t
  .get("/users/:id")
  .params(z.object({ id: z.coerce.number() }))
  .query(z.object({ includePosts: z.boolean().default(false) }))
  .returns({ 200: UserSchema, 404: ErrorSchema })
  .handler(async (ctx) => {
    // ctx.params.id is number
    // ctx.query.includePosts is boolean
    // ctx.db and ctx.requestId come from AppContext
    // ctx.state comes from layout/route middlewares
    return json({ id: ctx.params.id, name: "Alice" });
  });
```

#### Validation & Body Parsing Semantics

- **Path Params**: Inferred as `string` by default unless overridden by `.params(schema)`.
- **Query Params**: Parsed and validated via `.query(schema)`.
- **Body Parsing**:
  - If no `.body()` is declared, request body parsing is **completely skipped** (optimizing hot paths like GET/HEAD).
  - `.body(schema)` defaults to JSON body parsing.
  - `.body("form", schema)` or `.body("urlencoded", schema)` enables multipart or URL-encoded form parsing.

---

### 3.3 Layout & Middleware System

#### Hierarchical Layouts

Non-verb files (e.g. `src/routes/$.ts` for root, `src/routes/admin.ts` for `/admin/*`) define layout middleware chains:

```ts
import { t } from "@taserjs/router";

export default t.layout("/admin").use(async (ctx, next) => {
  const token = ctx.headers.get("authorization");
  if (!token) return ctx.reply.text("Unauthorized", { status: 401 });
  return next({ user: { id: "123", role: "admin" } });
});
```

#### Strict Phased Route Builder Lifecycle

Route definitions enforce a strict phased lifecycle at the type level:

1. **Middleware Phase** (`.use(...)`): Chained together at the start of the route definition.
2. **Contract / Schema Phase** (`.query()`, `.params()`, `.body()`, `.returns()`): Transitions the builder to a `RouteContractBuilder` where `.use()` is eliminated from autocomplete and type signatures.
3. **Execution Phase** (`.handler(...)`): The terminal handler function.

#### Faceted Precondition Requirements (`.requires<{ state?, params?, query?, body? }>()`)

Standalone middlewares declare compile-time preconditions across all 4 request facets:

```ts
const userParamMw = middleware()
  .requires<{ params: { userId: string } }>()
  .handler((ctx, next) => next({ user: ctx.params.userId }));
```

When attached via `.use(userParamMw)`, TypeScript verifies that the route path (e.g. `/users/:userId`) or upstream layout middleware provides the required facets.

#### Fluent Middleware Units

Standalone middlewares use the fluent `middleware()` builder:

```ts
import { middleware } from "@taserjs/router";
import { z } from "zod";

export const validatePagination = middleware().query(
  z.object({ page: z.coerce.number().default(1), limit: z.coerce.number().default(20) }),
);

export const authGuard = middleware().handler(async (ctx, next) => {
  return next({ session: { userId: "xyz" } });
});
```

#### Validation-Only Middlewares

Middlewares without handlers (e.g. `middleware().query(...)`) act as pure validation layers. The runtime pipeline automatically skips handler execution and forwards validation results into `ctx.query`, `ctx.params`, or `ctx.body`.

#### Automatic Union State Inference

When a middleware branches with different state payloads:

```ts
const featureFlag = middleware().handler((ctx, next) => {
  if (ctx.query.beta === "true") {
    return next({ betaUser: true as const, tier: "premium" as const });
  }
  return next({ betaUser: false as const, tier: "standard" as const });
});
```

The state is automatically inferred on downstream route handlers as:
`{ betaUser: true, tier: "premium" } | { betaUser: false, tier: "standard" }` without requiring manual generic annotations.

---

### 3.4 Generated Manifest & Runtime Pipeline (`@taserjs/router-core`)

The generator produces a flattened, type-safe runtime manifest `routeManifest`:

```ts
export const routeManifest = {
  layouts: {
    "/*": RootSplatLayoutImport,
    "/admin": AdminLayoutImport,
  },
  routes: {
    "/users": {
      GET: {
        layouts: ["/*"],
        route: UsersGetRouteImport,
      },
    },
  },
} as const;
```

At runtime, requests flow through an onion middleware pipeline:

1. **Layout Middlewares**: Executed in order of `route.layouts` from shallowest root to deepest nested layout.
2. **Route Middlewares**: Attached via `.use(...)` on specific routes.
3. **Route Validation Layer**: Merges validated fields (`query`, `params`, `body`).
4. **Route Handler**: Produces a `Response`.
5. **Response Finalization & Contracts**: Validates returned responses if response contracts are configured and handles cookies/headers.

---

### 3.5 RPC Client (`@taserjs/router-client`)

The client builds a zero-codegen typed proxy from your server's `RouteManifest` or `typeof app`. Success `json()` types are auto-inferred from handler `ReplyOf` returns by default; optional `.returns({ 200: schema })` overrides inference when present.

```ts
import { createClient } from "@taserjs/router-client";
import type { RouteManifest } from "../.taser/types/routes.js";

const client = createClient<RouteManifest>({ baseUrl: "http://localhost:3000" });

const res = await client.users._id.$get({
  param: { id: "usr_123" },
  query: { includePosts: true },
});

if (res.ok) {
  const data = await res.json(); // Typed from handler or returns[200] schema
}
```

---

## 4. Key Developer Commands

```bash
# Run tests across all packages
pnpm test

# Run typecheck across all packages & examples (21 targets)
pnpm typecheck

# Build all packages
pnpm build

# Build documentation site
pnpm --filter docs build
```

---

## 5. Coding & Contribution Guidelines

- **Zero Type Assertion Principle**: Ensure all API builders and pipelines preserve compile-time inference without requiring user-level type casting.
- **Fluent API Exclusivity**: Middleware and routes must use the fluent builder API (`middleware().query(...).handler(...)`) or function signature `(ctx, next) => next(...)`. Raw options object literals (`{ query, handler }`) are intentionally disallowed.
- **Exact Optional Properties**: Codebase compiles with `exactOptionalPropertyTypes: true` — optional properties must explicitly include `| undefined` when applicable.

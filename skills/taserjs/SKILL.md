---
name: taserjs
description: >-
  Builds and migrates type-safe REST APIs with Taser.js: file-based routing,
  layout middleware chains, Standard Schema validation, reply/stream helpers,
  and typed client RPC. Use when scaffolding, configuring, creating routes,
  refactoring middleware, integrating with Next.js/TanStack/Express/Fastify/Hono/Elysia,
  or debugging Taser.js backends.
license: ISC
compatibility: node >= 20
---

# Taser.js Agent Skill

Taser.js is a type-safe, file-based REST API framework for TypeScript. It runs standalone on Vite/Nitro or inside fullstack frameworks (Next.js, TanStack Start) and host servers (Express, Hono, Fastify).

Canonical packages: `@taserjs/router`, `@taserjs/cli`, `@taserjs/plugin`, `@taserjs/client`.

---

## Agent Decision Workflow

Follow this decision tree when handling user tasks:

```
Task Type?
├─ Create a new project or configure Taser.js?
│  └─► Read [references/setup.md](references/setup.md)
│
├─ Add or modify route endpoints or file names?
│  └─► Read [references/routing.md](references/routing.md)
│
├─ Add layouts, middleware, cascading state, cookies, or response transforms?
│  └─► Read [references/layouts-and-middleware.md](references/layouts-and-middleware.md)
│
├─ Define validation schemas, contracts, headers, or body parsing?
│  └─► Read [references/validation-and-contracts.md](references/validation-and-contracts.md)
│
├─ Return JSON, HTML, text, errors, or Web streams / SSE?
│  └─► Read [references/reply-and-stream.md](references/reply-and-stream.md)
│
├─ Connect client apps with typed RPC (`@taserjs/client`)?
│  └─► Read [references/client-rpc.md](references/client-rpc.md)
│
├─ Integrate with Next.js, TanStack Start, Express, or Hono host?
│  └─► Read [references/integrations.md](references/integrations.md)
│
└─ Migrate an existing codebase (Express, Hono, Fastify, Next.js) to Taser.js?
   └─► Read [references/migration.md](references/migration.md)
```

---

## Non-Negotiable Core Rules

All coding agents MUST follow these principles when writing or editing Taser.js code:

### 1. Phased Route Builder Lifecycle

Taser.js enforces a strict compile-time state machine:

```text
1. Middleware Phase       2. Contract / Schema Phase       3. Terminal Handler Phase
   .use(mw1).use(mw2)   ->   .query().params().body()     ->   .handler(async (ctx) => ...)
                            .returns(...)
```

- **Rule**: `.use(...)` cannot be called after `.params()`, `.query()`, `.body()`, or `.returns()`. The type system strips `.use()` once entering the contract phase.

### 2. Application Definition & Generated Manifest

- Export `defineTaser({ ... })` from `src/taser.ts` (or `src/server/taser.ts`). That produces an uninstantiated `TaserDefinition`.
- The runnable Hono `app`, ambient route types, and `AppManifest` are generated in `src/.taserjs/routes.gen.ts` (path follows `serverDir` + `outputDir` in `taserjs.config.ts`).
- Import `app` from `./.taserjs/routes.gen.js` (or `@/server/.taserjs/routes.gen`) in host entries — never instantiate the definition yourself in app code.
- Routes are scanned under `${serverDir}/routes` (default `src/routes/`).
- Regenerate with `pnpm dev` / `pnpm build` (plugin) or `npx @taserjs/cli generate` / `taser generate`.

### 3. Context (`ctx`) Discipline

- Initialized via `createContext({ boot: ..., request: ... })` and attached with `.context(context)` on `defineTaser()`.
- **Anti-Pattern**: Do NOT overwrite boot context keys inside request context.
- **Anti-Pattern**: Do NOT bloat context with utilities that can be imported directly into routes or middleware files.
- **Anti-Pattern**: Do not put heavy work in `request` context — it runs on every request. Reserve it for lightweight per-request metadata (request ID, timestamps, tracing). Use `boot` for expensive singletons (DB pools, SDK clients).
- Cookies are **not** ambient: mount `cookie()` from `@taserjs/router/middleware/cookie` on a layout before using `{ cookies }`.
- Handler args are facet-split: `{ req, ctx, state, ...services }`. Use `req.params` / `req.query` / `req.body` / `req.headers`; keep `ctx` for application context; keep cascaded middleware data on `state`.

### 4. Onion Architecture for Responses

- `const res = await next({ ... })` executes downstream handlers and returns a standard `Response`.
- Mutate response headers or wrap with `try / catch` in middleware to catch errors or transform outputs.
- `defineTaser().onError()` handles unhandled runtime crashes (500). Validation (`ValidationError` → 422) and response-contract failures bypass `onError`; catch them in middleware `try/catch` when you need custom mapping.

---

## Verification Checklist

Always perform these verification steps after adding or modifying Taser.js code:

- [ ] **Generate Manifest**: Run `pnpm dev` or `pnpm build` (or `taser generate` / `npx @taserjs/cli generate`) so `${serverDir}/.taserjs/routes.gen.ts` exists.
- [ ] **Typecheck**: Run `pnpm typecheck` or `npx tsc --noEmit` (after generate for standalone `tsc`).
- [ ] **Verify Route Layouts**: Check that layout IDs match file hierarchy (e.g. `src/routes/admin.ts` -> `t.layout("/admin")`).
- [ ] **Verify HTTP Method**: Ensure filename verb suffix matches the builder verb (e.g. `users.get.ts` uses `t.get(...)`).
- [ ] **Smoke Test**: Start the dev server and verify endpoints via `curl -i http://localhost:3000/...` (include `defineTaser().basePath(...)` prefix when set).

---

## Reference Topic Index

For detailed guides, code recipes, and full API references, open the relevant topic:

- **[Setup & Configuration](references/setup.md)**: Scaffolding, `defineTaser`, `taserjs.config.ts`, `@taserjs/cli` / `@taserjs/plugin`, boot vs request context.
- **[File-Based Routing](references/routing.md)**: File naming rules, parameters, splats, pathless groups, breakout routes, `routes.gen.ts`.
- **[Layouts & Middleware](references/layouts-and-middleware.md)**: Middleware types, `cookie()` middleware, cascading state, response mutation.
- **[Validation & Contracts](references/validation-and-contracts.md)**: Standard Schema (Zod/Valibot/ArkType), params/query/body validation, `ctx` properties.
- **[Reply & Stream Helpers](references/reply-and-stream.md)**: `@taserjs/router/reply` status helpers, edge-compatible `@taserjs/router/stream` (`pipe`, `buffer`, `blob`, `sse`).
- **[Client RPC](references/client-rpc.md)**: `@taserjs/client` with `createClient<AppManifest>()`, proxy methods, form uploads.
- **[Framework Integrations](references/integrations.md)**: Next.js App Router, TanStack Start, and Host Pass-Through (Express, Hono, Fastify).
- **[Migration Playbook](references/migration.md)**: Zero-downtime adoption strategy, handler conversion tables, Express/Hono migration recipes.

---

## Online Documentation & LLM Endpoints

When real-time or complete framework documentation is required:

- **Concise LLM Reference**: [`https://taserjs.dev/llms.txt`](https://taserjs.dev/llms.txt)
- **Full Consolidated LLM Documentation**: [`https://taserjs.dev/llms-full.txt`](https://taserjs.dev/llms-full.txt)
- **Interactive Documentation**: [`https://taserjs.dev/docs`](https://taserjs.dev/docs)

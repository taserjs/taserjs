---
name: taserjs
description: >-
  Builds and migrates type-safe REST APIs with Taser/TaserJS: file-based routing,
  layout middleware chains, Standard Schema validation, reply/stream helpers,
  and typed client RPC. Use when scaffolding, configuring, creating routes,
  refactoring middleware, integrating with Next.js/TanStack/Express/Fastify/Hono/Elysia,
  or debugging Taser/TaserJS backends.
license: ISC
compatibility: node >= 20
---

# TaserJS Agent Skill

TaserJS is a type-safe, file-based REST API framework for TypeScript. It runs standalone on Vite/Nitro or inside fullstack frameworks (Next.js, TanStack Start) and host servers (Express, Hono, Fastify).

---

## Agent Decision Workflow

Follow this decision tree when handling user tasks:

```
Task Type?
├─ Create a new project or configure TaserJS?
│  └─► Read [references/setup.md](references/setup.md)
│
├─ Add or modify route endpoints or file names?
│  └─► Read [references/routing.md](references/routing.md)
│
├─ Add layouts, middleware, cascading state, or response transforms?
│  └─► Read [references/layouts-and-middleware.md](references/layouts-and-middleware.md)
│
├─ Define validation schemas, contracts, headers, cookies, or body parsing?
│  └─► Read [references/validation-and-contracts.md](references/validation-and-contracts.md)
│
├─ Return JSON, HTML, text, errors, or binary/media streams?
│  └─► Read [references/reply-and-stream.md](references/reply-and-stream.md)
│
├─ Connect client apps with typed RPC (`@taserjs/router-client`)?
│  └─► Read [references/client-rpc.md](references/client-rpc.md)
│
├─ Integrate with Next.js, TanStack Start, Express, or Hono host?
│  └─► Read [references/integrations.md](references/integrations.md)
│
└─ Migrate an existing codebase (Express, Hono, Fastify, Next.js) to TaserJS?
   └─► Read [references/migration.md](references/migration.md)
```

---

## Non-Negotiable Core Rules

All coding agents MUST follow these principles when writing or editing TaserJS code:

### 1. Phased Route Builder Lifecycle

Taser enforces a strict compile-time state machine:

```text
1. Middleware Phase       2. Contract / Schema Phase       3. Terminal Handler Phase
   .use(mw1).use(mw2)   ->   .query().params().body()     ->   .handler(async (ctx) => ...)
                            .returns(...)
```

- **Rule**: `.use(...)` cannot be called after `.params()`, `.query()`, `.body()`, or `.returns()`. The type system strips `.use()` once entering the contract phase.

### 2. Type Generation Requirement

- Routes are scanned inside `src/routes/` (or `serverDir/routes`).
- Type declarations (`.taser/types/routes.d.ts`) are generated during `dev` or `build` via `@taserjs/router-plugin`.
- If type errors appear in IDE or tests after creating new route files, run `pnpm dev`, `pnpm build`, or `npx taser generate` to regenerate declarations.

### 3. Context (`ctx`) Discipline

- Initialized via `createContext({ boot: ..., request: ... })`.
- **Anti-Pattern**: Do NOT overwrite boot context keys inside request context.
- **Anti-Pattern**: Do NOT bloat context with utilities that can be imported directly into routes or middleware files.
- **Anti-Pattern**: Do not put heavy work in `request` context — it runs on every request. Reserve it for lightweight per-request metadata (request ID, timestamps, tracing). Use `boot` for expensive singletons (DB pools, SDK clients).

### 4. Onion Architecture for Responses

- `const res = await next({ ... })` executes downstream handlers and returns a standard `Response`.
- Mutate response headers or wrap with `try / catch` in middleware to catch errors or transform outputs.

---

## Verification Checklist

Always perform these verification steps after adding or modifying TaserJS code:

- [ ] **Generate Types**: Run `pnpm dev` or `pnpm build` (or `npx @taserjs/router-cli generate`) to emit `.taser/types/routes.d.ts`.
- [ ] **Typecheck**: Run `pnpm typecheck` or `npx tsc --noEmit` to confirm 0 type errors across routes, layouts, and client calls.
- [ ] **Verify Route Layouts**: Check that layout IDs match file hierarchy (e.g. `src/routes/admin.ts` -> `t.layout("/admin")`).
- [ ] **Verify HTTP Method**: Ensure filename verb suffix matches the builder verb (e.g. `users.get.ts` uses `t.get(...)`).
- [ ] **Smoke Test**: Start the dev server and verify endpoints via `curl -i http://localhost:3000/...`.

---

## Reference Topic Index

For detailed guides, code recipes, and full API references, open the relevant topic:

- **[Setup & Configuration](references/setup.md)**: Scaffolding, CLI options, `createTaserApp`, boot vs request context.
- **[File-Based Routing](references/routing.md)**: File naming rules, parameters, splats, pathless groups, breakout routes.
- **[Layouts & Middleware](references/layouts-and-middleware.md)**: Middleware types, layout scoping, union scoping, cascading state, response mutation.
- **[Validation & Contracts](references/validation-and-contracts.md)**: Standard Schema (Zod/Valibot/ArkType), params/query/body validation, `ctx` properties.
- **[Reply & Stream Helpers](references/reply-and-stream.md)**: `@taserjs/router/reply` status helpers, `@taserjs/router/stream` binary/file streaming.
- **[Client RPC](references/client-rpc.md)**: `@taserjs/router-client` proxy client, `$get/$post/$put/$patch/$delete`, form uploads.
- **[Framework Integrations](references/integrations.md)**: Next.js App Router, TanStack Start, and Host Pass-Through (Express, Hono, Fastify).
- **[Migration Playbook](references/migration.md)**: Zero-downtime adoption strategy, handler conversion tables, Express/Hono migration recipes.

---

## Online Documentation & LLM Endpoints

When real-time or complete framework documentation is required:

- **Concise LLM Reference**: [`https://taserjs.dev/llms.txt`](https://taserjs.dev/llms.txt)
- **Full Consolidated LLM Documentation**: [`https://taserjs.dev/llms-full.txt`](https://taserjs.dev/llms-full.txt)
- **Interactive Documentation**: [`https://taserjs.dev/docs`](https://taserjs.dev/docs)

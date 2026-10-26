---
name: taserjs
description: Builds and migrates type-safe REST APIs with Taser.js. Use when scaffolding or configuring a Taser project, adding routes or layouts, writing middleware or context, validating schemas and response contracts, streaming replies or SSE, connecting typed RPC clients, integrating with Next.js, TanStack Start, React Router, Nuxt, SvelteKit, Vite, or Express/Fastify/Hono/Elysia hosts, deploying with Nitro, or migrating existing APIs.
license: ISC
compatibility: node >= 20.19
---

# Taser.js

Type-safe, file-based REST API framework for TypeScript. Runs standalone on Vite/Nitro or inside fullstack frameworks (Next.js, TanStack Start, React Router, Nuxt, SvelteKit, Vite SPA) and host servers (Express, Fastify, Hono, Elysia).

## Build Workflow

Follow these steps in sequence. Each step ends on a checkable completion criterion.

1. **Scaffold or detect project**:
   - New project: run `pnpm create taserjs@latest <name> -f <framework> -v <validator> --db <db> --driver <driver> -l <logger> -y`.
   - Existing project: confirm `taserjs.config.ts`, `${serverDir}/taser.ts`, and framework plugin integration exist.
   - _Criterion_: `taserjs.config.ts` exists and resolves `serverDir` and `routesDir`.

2. **Generate route manifest**:
   - Run `npx @taserjs/cli generate` (or start `pnpm dev`).
   - _Criterion_: `${serverDir}/.taserjs/routes.gen.ts` exists and exports `app` and `routeManifest`.

3. **Write routes and middleware**:
   - Create verb endpoints (`.get.ts`, `.post.ts`) and layouts (`$.ts`, `_group.ts`) under `routesDir`.
   - Apply phased builder order: middleware first, then contract schemas, then terminal handler.
   - _Criterion_: Route builder verb and path match filename; layout IDs end with `/*`.

4. **Typecheck and verify contracts**:
   - Run `npx tsc --noEmit`.
   - _Criterion_: Zero TypeScript diagnostic errors in route files and `.returns()` contracts.

5. **Run and smoke test**:
   - Start the server (`pnpm dev`) or run in-process tests using `app.request(path, init)`.
   - Smoke test endpoints with `curl -i http://localhost:3000/<route>`.
   - _Criterion_: Endpoints return expected HTTP status and payload; invalid inputs return 422.

## Task Router

When the user request matches a branch, open its reference:

| When you need to...                                                                                             | Read                                                                             |
| :-------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------- |
| Scaffold with CLI flags, inspect folder layouts, configure `taserjs.config.ts`, set build scripts               | [references/project-setup.md](references/project-setup.md)                       |
| Name route files, define parameters, optional segments, splats, layouts, pathless groups, breakout routes       | [references/routes.md](references/routes.md)                                     |
| Validate params, query, or body, enforce `.returns()` contracts, send typed replies, map errors                 | [references/validation-and-responses.md](references/validation-and-responses.md) |
| Define boot/request context, create layouts, cascade `state`, manage cookies, use built-in middleware           | [references/context-and-middleware.md](references/context-and-middleware.md)     |
| Return Web streams, binary buffers, blobs, or Server-Sent Events (SSE)                                          | [references/streaming.md](references/streaming.md)                               |
| Call routes from frontend or tests with typed RPC (`@taserjs/client`), upload FormData                          | [references/client.md](references/client.md)                                     |
| Mount Taser in Next.js, TanStack Start, React Router, Nuxt, SvelteKit, Vite SPA, Express, Fastify, Hono, Elysia | [references/integrations.md](references/integrations.md)                         |
| Build for production, configure Nitro presets (`node-server`, `cloudflare-module`, `vercel`), run start scripts | [references/deployment.md](references/deployment.md)                             |
| Configure database ORM (Drizzle, Prisma, Kysely), logger (Pino, Winston), or validator (Zod, Valibot, ArkType)  | [references/addons.md](references/addons.md)                                     |
| Test routes in-process with `app.request` or `@taserjs/client` without opening a port                           | [references/testing.md](references/testing.md)                                   |
| Structure larger APIs, standardize error envelopes, protect auth routes, handle pagination                      | [references/best-practices.md](references/best-practices.md)                     |
| Migrate Express, Hono, Fastify, or Next.js codebases incrementally with zero downtime                           | [references/migration.md](references/migration.md)                               |

## Core Rules

1. **Phased Builder Lifecycle**:
   - `.use(...)` (middleware) MUST precede `.params()`, `.query()`, `.headers()`, `.body()`, and `.returns()`. The compiler strips `.use()` once entering contract phase.
   - Terminal `.handler(...)` consumes `{ req, ctx, state, ...services }`.
2. **Facet-Split Handlers**:
   - `req`: HTTP inputs (`params`, `query`, `headers`, `body`, `method`, `url`, `path`, `raw`).
   - `ctx`: Boot and request services from `createContext` (DB, logger, requestId).
   - `state`: Downstream cascaded values from middleware `next({ key: val })`.
   - `...services`: Services provided by `next.provide(...)` (e.g. `{ cookies }`).
3. **Application Definition & Manifest**:
   - Export `defineTaser({ ... })` from `${serverDir}/taser.ts`.
   - Manifest is compiled into `${serverDir}/.taserjs/routes.gen.ts`. Import `app` from this file in host entries and tests. Do not instantiate `defineTaser` manually.

## Documentation Map

- **Concise Index**: [`https://taserjs.dev/llms.txt`](https://taserjs.dev/llms.txt)
- **Per-Page Markdown**: Append `content.md` to documentation paths at `https://taserjs.dev/llms.mdx/docs/<slug>/content.md` (e.g. `https://taserjs.dev/llms.mdx/docs/routing/file-conventions/content.md`).
- **Full Reference (large, use as last resort)**: [`https://taserjs.dev/llms-full.txt`](https://taserjs.dev/llms-full.txt)

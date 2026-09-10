## Destination

The destination has been reached: [Technical Architecture Specification](spec.md) (`.scratch/architecture-revamp/spec.md`) is fully authored, locking the Hono runtime architecture, package consolidation and renames, context distribution model, and `.taserjs` static code generation pipeline, fully ready for execution.

## Notes

- Domain: Routing library and Hono runtime integration (see `CONTEXT.md` and `plans/architecture-revamp.md`).
- Skills every session should consult: `grilling`, `domain-modeling`, `research`.
- Standing preferences:
  - Clean-slate greenfield rewrite from zero. No legacy code, assumptions, or backward-compatibility workarounds remain.
  - Dedicated `taserjs.config.ts` handles all routing, scanning, codegen, extensions, and base paths loaded via `jiti`.
  - Heuristic detection of routing configs from `vite.config.*`, `nitro.config.*`, or `next.config.*` is completely eliminated. Bundler plugins are thin adapters.
  - Taser is not a framework, but a type-safe routing library proxying to Hono.
  - `createTaserApp()` returns a standard Hono application instance.
  - Route handlers receive an explicit destructured context: `({ req, ctx, state, ...injected })`.
  - Static route manifest is emitted into a gitignored `.taserjs/` directory without virtual modules.
  - Package renaming and CLI consolidation will occur as a coordinated breaking release.

## Implementation Tickets

The implementation roadmap has been decomposed into 10 tracer-bullet vertical slice tickets:

1. [01: Greenfield Monorepo Workspace Consolidation & Package Scaffolding](issues/01-monorepo-consolidation.md)
2. [02: Minimal Route Builder & Hono Runtime Dispatch](issues/02-route-builder-and-hono-dispatch.md)
3. [03: Composed Onion Pipeline & Context Model](issues/03-composed-onion-pipeline.md)
4. [04: Standard Schema Bidirectional Validation & Body Parser Pipeline](issues/04-standard-schema-and-body-pipeline.md)
5. [05: Dynamic Services (`next.provide`), Cookie Middleware, & `t.hono` Adapter](issues/05-dynamic-services-and-cookie-middleware.md)
6. [06: AST Route Scanner & Manifest Codegen (`@taserjs/cli generate`)](issues/06-route-scanner-and-manifest-codegen.md)
7. [07: Ambient Type Generation (`.taserjs/routes.d.ts`) & Route Context Inference](issues/07-ambient-type-generation-and-inference.md)
8. [08: Centralized Configuration (`taserjs.config.ts`) & Bundler Plugin (`@taserjs/plugin`)](issues/08-centralized-config-and-bundler-plugin.md)
9. [09: Project Scaffolding Engine (`@taserjs/cli create` & `create-taserjs`)](issues/09-scaffolding-engine-and-create-taserjs.md)
10. [10: Type-Safe RPC Client (`@taserjs/client`)](issues/10-typesafe-rpc-client.md)
11. [11: Inverted Application Runtime, `defineTaser()`, & Source-Scoped Codegen](issues/11-inverted-application-runtime-and-composition.md)
12. [12: Cascading Middleware and Layout Type Inference](issues/12-cascading-layout-and-middleware-inference.md)
13. [13: Enforce RouteBuilder Fluent Ordering (`.use` Restricted Before Route Validations)](issues/13-enforce-route-builder-middleware-ordering.md)
14. [14: Support Plugin `server` Option & Full-Stack Environment Detection in Vite Plugin](issues/14-standalone-vs-fullstack-vite-plugin-server-mode.md)
15. [15: Cross-Platform Path Normalization via `pathe` in `@taserjs/cli` and `@taserjs/plugin`](issues/15-use-pathe-for-cross-platform-windows-support.md)
16. [16: Standalone Validator Middleware (`t.middleware()` without Terminal `.handler()`)](issues/16-standalone-validator-middleware.md)
17. [17: Streamline Manifest Codegen and Router Type Registration](issues/17-streamline-manifest-codegen-and-router-type-registration.md)
18. [18: Runtime Performance Benchmarks (Taser vs Plain Hono)](issues/18-runtime-performance-benchmarks.md)
19. [19: Runtime Pipeline Fast-Paths and Lazy Request Optimizations](issues/19-runtime-pipeline-fast-path-and-lazy-request-optimization.md)
20. [20: Synchronous Dispatch Loop, Zero-Alloc Reply Helpers, and Dirty-Checked Cookie Flushing](issues/20-sync-dispatch-loop-and-zero-alloc-reply-helpers.md)

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [Synchronous Dispatch Loop, Zero-Alloc Reply Helpers, and Dirty-Checked Cookie Flushing](issues/20-sync-dispatch-loop-and-zero-alloc-reply-helpers.md): Closed the remaining performance gap to native Hono (~95k–104k req/s matching native Hono baseline) by introducing synchronous pipeline returns and Hono route callback invocation in `app.on`, zero-alloc fast path in `json()` using cached headers and direct property assignments, single-middleware fast path in `createPipeline`, static frozen empty state and parameter sharing, and dirty tracking in `TaserCookieJar`.
- [Runtime Pipeline Fast-Paths & Lazy Request Optimizations](issues/19-runtime-pipeline-fast-path-and-lazy-request-optimization.md): Optimized `@taserjs/runtime` request dispatch throughput by implementing lazy request property evaluation with prototype-level class accessors (`TaserRequestImpl`), zero-middleware pipeline bypass (`executeDirect`), synchronous context resolution fast-paths (`resolveContextSync`), suppressed V8 stack traces on protocol `ValidationError` (422), and streamlined response cookie appending in `mergeResponseCookies`.
- [Runtime Performance Benchmarks (Taser vs Plain Hono)](issues/18-runtime-performance-benchmarks.md): Built Vitest benchmark test suite (`@taserjs/runtime/bench/runtime.bench.ts`) comparing Taser pipeline overhead against raw Hono across 11 scenarios (baseline GET, route middleware, layout middleware with state, composed layout + route, dynamic services, Standard Schema body parsing, context resolution, dynamic route params, query extraction/coercion, cookie jar lifecycle, and 422 validation fast rejection) with root and package-level `bench` scripts wired through Turbo.
- [Streamline Manifest Codegen & Router Type Registration](issues/17-streamline-manifest-codegen-and-router-type-registration.md): Pruned dead manifest types (`LayoutManifest`, `AppManifest`), eliminated `LayoutMiddlewares` and its redundant layout extractor fallbacks in `@taserjs/router`, and streamlined manifest type exports across `@taserjs/cli` and starter templates.
- [Support Plugin `server` Option & Full-Stack Environment Detection](issues/14-standalone-vs-fullstack-vite-plugin-server-mode.md): Supported `server?: boolean` in `TaserPluginOptions`, `TaserConfig`, and `ResolvedTaserConfig`. Auto-detected full-stack frameworks (TanStack Start, Nitro, React Router, Remix, Astro, SvelteKit) in Vite plugins to disable standalone `serve.mjs` emission and dev Connect middleware while maintaining route generation and watching. Added defensive guards against non-runnable `ssr` environments (e.g. `FetchableDevEnvironment`).
- [Ambient Type Generation & Route Context Inference](issues/07-ambient-type-generation-and-inference.md): Implemented ambient `.taserjs/routes.d.ts` augmenting `RouterRegister` with `RoutePath`, `LayoutTree`, `LayoutMiddlewares`, `RouteByPathMethod`, and `AppContext`. Built static service inference (`next.provide`) enforcing compile-time errors when unmounted middleware services (e.g. `cookies`) are destructured. Verified with end-to-end `tsc` test suite.
- [Inverted Application Runtime and Composition (ADR 0002)](../../works/adr/0002-inverted-application-runtime-and-composition.md): Inverted runtime architecture to compile Hono `app` inside generated `src/.taserjs/routes.ts` from declarative `defineTaser()` in `src/taser.ts`. Eliminated AST parsing for context via phantom types, resolved source directories under `serverDir`, and standardized protocol error boundaries (422/415 automatic; custom 500 handler).
- [Monorepo workspace consolidation](issues/01-monorepo-consolidation.md): Monorepo consolidated into 7 core packages (`@taserjs/runtime`, `@taserjs/router`, `@taserjs/cli`, `@taserjs/plugin`, `@taserjs/utils`, `@taserjs/client`, `create-taserjs`), obsolete legacy packages removed, and baseline build/typecheck/test/lint established clean.
- [Minimal Route Builder & Hono Runtime Dispatch](issues/02-route-builder-and-hono-dispatch.md): Implemented route builders (`t.get/post/put/delete/patch`), basic route definition model, path normalization converting `:id` / `$id` / `*` to Hono routes, `json` reply helper in `@taserjs/utils`, and `createTaserApp(manifest)` dispatching native Hono requests.
- [Context attachment and returns schema](spec.md): `createContext` attaches runtime singleton boot and per-request properties to `ctx` via `createTaserApp(manifest, { context })` and augments `RouterRegister["AppContext"]` statically via `.taserjs/routes.d.ts`; `.returns(Record<StatusCode, Schema>)` is stored as route metadata for future OpenAPI generation; cookies mutate via `TaserCookieJar` proxying `hono/cookie` and are flushed to the outgoing Response during onion unwinding.
- [Hono pipeline registration strategy](issues/01-hono-pipeline-registration.md): `@taserjs/runtime` pre-composes all cascading layouts, pathless layouts, schemas, and handlers into a single route-level Composed Handler registered directly on Hono methods, maintaining onion pipeline semantics and letting unhandled errors bubble to Hono's `app.onError()`.
- [Standard Schema and body parsing pipeline](issues/02-standard-schema-and-body-pipeline.md): Validations run per onion layer, bodies parse using Hono's native parser methods with 415 checks, transformations mutate `req` in-place, and `ValidationError` bubbles to Hono's `app.onError()` defaulting to 422 `{ errors: issues }`.
- [Context distribution and TypeScript inference](issues/03-context-distribution-and-inference.md): Handlers and middlewares receive a base `({ req, ctx, state })` signature; services like `cookies` are injected conditionally via `next.provide({ cookies })` from `@taserjs/router/cookie`, Hono middlewares adapt cleanly using `t.hono(...)`, and `ctx.context` exposes native Hono Context at runtime for library authors while remaining unexposed in TypeScript types.
- [Generated route manifest in `.taserjs`](issues/04-taserjs-codegen-manifest.md): Manifest emits static TypeScript imports in `.taserjs/routes.ts` alongside ambient `.taserjs/routes.d.ts`, consumed explicitly via `createTaserApp(routeManifest)` with content-hash file caching to prevent watch loops.
- [CLI consolidation and create-taserjs wrapper](issues/05-cli-consolidation-architecture.md): `@taserjs/cli` combines generator and CLI exposing `generate` and `create`, while `create-taserjs` is a thin binary wrapper delegating to `taser create`.
- [Research Hono subrouting, pathless middleware, and context overhead](issues/06-research-hono-subrouting-and-pathless-middleware.md): Hono lacks native pathless route grouping, confirming that Taser's cascading and pathless layouts must be composed per route chain rather than mounted as wildcard global middleware.

## Not yet specified

- Cookie jar API bridging between Hono `hono/cookie` and `ctx.cookies`.
- Outgoing response contract runtime validation performance optimizations in Hono.
- Migration codemod and documentation for converting flat `ctx` handlers to `{ req, ctx, state }`.
- Test harness utilities for testing Hono-based Taser applications with Vitest / Web standards.

## Out of scope

- Writing custom HTTP server engines or radix trees (Hono handles all routing and dispatch).
- Custom host pass-through engines for Express/Fastify (delegated to Hono's standard ecosystem adapters).
- Dynamic runtime route discovery via filesystem scanning in production (must use `.taserjs` manifest).
- Layout breakout routes (`segment_`): deferred for later exploration due to layout-level ambiguities and boundary complexity.

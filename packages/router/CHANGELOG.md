# @taserjs/router

## 0.3.0

### Patch Changes

- @taserjs/utils@0.3.0

## 0.2.8

### Patch Changes

- 31995f1: refactor: Clean refactor of the dev tooling (cli, plugin, utils)

  - cli: drop the `formatting` option, always scaffold `taser.ts`, replace `yargs`/`picocolors` with Node built-ins, export `watchRoutes`, ESM-only with a dedicated `dist/bin.js`.
  - plugin: split into focused modules, one `shouldRegenerate` check, one route watcher shared with the CLI, realpath-aware Vite invalidation (newly added routes are served without a restart), no package root export, remove `withTaser` and `runNextTaserGeneration`.
  - runtime: add `mountFetchHost` (`@taserjs/runtime/serve`) and `mountNodeHost` (`@taserjs/runtime/serve/node`), and re-export `toNodeHandler`.
  - utils: one typed-response core, shared header defaults, shared zero-trace error base, lazy 415 response, remove `validateStandardSchema`.

- f98ff9d: fix (client): remove trailing slash causing 404
- Updated dependencies [31995f1]
- Updated dependencies [f98ff9d]
  - @taserjs/utils@0.2.8

## 0.2.7

### Patch Changes

- 9b61c25: perf: Runtime performance pass

  - Benchmark: replace the vitest bench with a node harness that runs against the built `dist` and reports paired Taser/Hono ratios, with `bench:node`, `bench:check` (fails on a >25% ratio regression against `bench/baseline.json`) and `bench:update`
  - Cookies: rewrite the cookie jar on top of the request's `Cookie` header and a single flush of `Set-Cookie` headers instead of routing every read and write through Hono's `Context`. `cookies.get()` always reflects the request header and returns a copy. Cookie scenario went from ~2.1x to ~1.35x of Hono
  - Cookies: `cookie()` writes `Set-Cookie` to returned and thrown `Response`s and to the default error response (500, or 422 for validation failures). A custom `onError` owns its own cookies. Documented in the cookies guide
  - Cookies: `hono()` middleware adapter re-adds downstream cookies only when both sides have some, instead of merging on every `next()`
  - Query: add a single-pass query string parser that matches Hono's decoding (`+` as space, empty names skipped, `#` fragment stripped, repeated keys become arrays, `__proto__` ignored) and share one frozen empty object for requests without a query string
  - Validation: report failures as a result instead of throwing on routes without middleware, so the 422 rejection no longer pays for an exception unwind. Invalid-body requests went from ~1.35x to ~1.05x of Hono. `ValidationError` is still thrown to middleware that wraps `next()`
  - Validation: stages that validate a subset keep the input later stages need. Each stage writes back its validated values merged over the original `params`, `query` and `body`
  - Pipeline: remove redundant promise hops from dispatch, `next`, `next.provide` and middleware execution, and build handler arguments only after validation. Middleware routes are 0.3 to 1.0 us faster
  - Context: create the boot promise once and reuse it, with a shared resolved result for apps without a boot
  - Prune dead code: unreachable branches in the pipeline, body parsing, `hono()` response handling and env detection, plus unused internal helpers
  - Remove unused exports: `mergeResponseCookies` from `@taserjs/utils`, the unused `Extract*FromLayout` and `ExtractServices/StateFromMiddleware` type helpers from `@taserjs/router`, and the unused type re-exports from `@taserjs/runtime`. Internal helpers (`isStandardSchema`, `JsonResponse`, `createReply`, `createTypedResponse`) are removed or made module-private
  - Remove `LayoutBuilder.schemas` and `LayoutDefinition.schemas`. Layout schemas already travel as a schema middleware in `middlewares`, so validation behavior is unchanged
  - Export `executeSchema` from `@taserjs/utils`

- Updated dependencies [9b61c25]
  - @taserjs/utils@0.2.7

## 0.2.6

### Patch Changes

- d7d2985: feat: Optional Path Params Support
  fix: Optimize router types and builder immutability
- Updated dependencies [d7d2985]
  - @taserjs/utils@0.2.6

## 0.2.5

### Patch Changes

- ff53de8: Remove Duplicate and Unused Exports, use standard json in scaffold
- Updated dependencies [ff53de8]
  - @taserjs/utils@0.2.5

## 0.2.4

### Patch Changes

- 66b4561: Smart Merge State, Service and Strict Return Types
- Updated dependencies [66b4561]
  - @taserjs/utils@0.2.4

## 0.2.3

### Patch Changes

- 6333a73: feat: Support Breakout Segment Routing
- Updated dependencies [6333a73]
  - @taserjs/utils@0.2.3

## 0.2.2

### Patch Changes

- c5fe1b6: Fix Vite Watch & HMR Create / Delete Routes
- Updated dependencies [c5fe1b6]
  - @taserjs/utils@0.2.2

## 0.2.1

### Patch Changes

- 4516b29: Plugin & Runtime Fixes and Improvements
- Updated dependencies [4516b29]
  - @taserjs/utils@0.2.1

## 0.2.0

### Minor Changes

- 06b544f: 0.2.0: Architectural Rewrite

  - Refactored the entire routing system to be more modular and flexible.
  - Renamed packages to be more consistent and descriptive.
  - Segregated ctx and state into request, state, and context facets.
  - Taser is now a Router-Only package and can have many runtimes.
  - It is not trying to be a Backend Framework beyond the scope of the router.

### Patch Changes

- Updated dependencies [06b544f]
  - @taserjs/utils@0.2.0

## 0.1.13

### Patch Changes

- 0cf6eaa: fix: Windows Posix Path Resolve Error
- Updated dependencies [0cf6eaa]
  - @taserjs/router-core@0.1.13
  - @taserjs/router-utils@0.1.13

## 0.1.12

### Patch Changes

- e07eeb0: fix: Deterministic CLI Generate Command
- Updated dependencies [e07eeb0]
  - @taserjs/router-core@0.1.12
  - @taserjs/router-utils@0.1.12

## 0.1.11

### Patch Changes

- @taserjs/router-core@0.1.11
  - @taserjs/router-utils@0.1.11

## 0.1.10

### Patch Changes

- d35ce2f: feat: Performance improment and minor fixes
- Updated dependencies [d35ce2f]
  - @taserjs/router-core@0.1.10
  - @taserjs/router-utils@0.1.10

## 0.1.9

### Patch Changes

- 70cf32a: fix: Layout tree relationship
  feat: Added skills, install via `npx skills add taserjs/taserjs`
- Updated dependencies [70cf32a]
  - @taserjs/router-core@0.1.9
  - @taserjs/router-utils@0.1.9

## 0.1.8

### Patch Changes

- e4aa72d: fix: Layout Type Inference Cyclic Reference Issue
- Updated dependencies [e4aa72d]
  - @taserjs/router-core@0.1.8
  - @taserjs/router-utils@0.1.8

## 0.1.7

### Patch Changes

- c31d57a: feat: Strict handler middleware registration
  feat: Add `QUERY` http handler
- Updated dependencies [c31d57a]
  - @taserjs/router-core@0.1.7
  - @taserjs/router-utils@0.1.7

## 0.1.6

### Patch Changes

- 8ff9b40: fix: State inference from stateless middlewares from layout
- Updated dependencies [8ff9b40]
  - @taserjs/router-core@0.1.6
  - @taserjs/router-utils@0.1.6

## 0.1.5

### Patch Changes

- 80b24e4: feat: Unified Fluent Architecture

  - Should reduce friction of adoption, ambient types for everything, less manual setup
  - All taser routes and app now explicitly export default instead of named export
  - Avoid mistakes of inferring context from Route named export
  - Clear difference between layout and middleware
  - Fluent middleware syntax with validation only pattern
  - Client supports multiple service instances
  - Better docs

- Updated dependencies [80b24e4]
  - @taserjs/router-core@0.1.5
  - @taserjs/router-utils@0.1.5

## 0.1.4

### Patch Changes

- 90091a4: feat: Performance Improvements in watcher and router
  feat: Consistent middleware fluent API
  feat: Short middleware syntax with `.use(callback)`
  remove: Unnecessary defineHandler API
  fix: `stream.file()` path traversal protection
- Updated dependencies [90091a4]
  - @taserjs/router-core@0.1.4
  - @taserjs/router-utils@0.1.4

## 0.1.3

### Patch Changes

- 73bd632: fix: Next.js dev phase detection and add auto-scaffolding for new
  routes
- Updated dependencies [73bd632]
  - @taserjs/router-core@0.1.3
  - @taserjs/router-utils@0.1.3

## 0.1.2

### Patch Changes

- bcea945: fix: Next.js Plugin
- Updated dependencies [bcea945]
  - @taserjs/router-core@0.1.2
  - @taserjs/router-utils@0.1.2

## 0.1.1

### Patch Changes

- e5609c2: Minor fixes and Feature Additions
- Updated dependencies [e5609c2]
  - @taserjs/router-core@0.1.1
  - @taserjs/router-utils@0.1.1

## 0.1.0

### Minor Changes

- b5eab15: Fluent API, Nitro Deployments, Vite Base. All New TaserJS

### Patch Changes

- Updated dependencies [b5eab15]
  - @taserjs/router-core@0.1.0
  - @taserjs/router-utils@0.1.0

## 0.0.5

### Patch Changes

- fa0f18c: feat: Perf Improvements and Web Standard Response
- Updated dependencies [fa0f18c]
  - @taserjs/router-core@0.0.5
  - @taserjs/router-utils@0.0.5

## 0.0.4

### Patch Changes

- a0c7c58: feat: Additional Replies and Scoped Middlewares
- Updated dependencies [a0c7c58]
  - @taserjs/router-core@0.0.4
  - @taserjs/router-utils@0.0.4

## 0.0.3

### Patch Changes

- c6790d4: Generator Fixes & Performance Improvements with Rou3 Matcher
- Updated dependencies [c6790d4]
  - @taserjs/router-core@0.0.3
  - @taserjs/router-utils@0.0.3

## 0.0.2

### Patch Changes

- c8d2b57: Create taser fix and bundle size optimization
- Updated dependencies [c8d2b57]
  - @taserjs/router-core@0.0.2
  - @taserjs/router-utils@0.0.2

## 0.0.1

### Patch Changes

- ae450cf: Fix Internal var exposure and add validator picker while create
  taserjs project
- Updated dependencies [ae450cf]
  - @taserjs/router-core@0.0.1
  - @taserjs/router-utils@0.0.1

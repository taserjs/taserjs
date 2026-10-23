# @taserjs/cli

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

## 0.2.6

### Patch Changes

- d7d2985: feat: Optional Path Params Support
  fix: Optimize router types and builder immutability

## 0.2.5

### Patch Changes

- ff53de8: Remove Duplicate and Unused Exports, use standard json in scaffold

## 0.2.4

### Patch Changes

- 66b4561: Smart Merge State, Service and Strict Return Types

## 0.2.3

### Patch Changes

- 6333a73: feat: Support Breakout Segment Routing

## 0.2.2

### Patch Changes

- c5fe1b6: Fix Vite Watch & HMR Create / Delete Routes

## 0.2.1

### Patch Changes

- 4516b29: Plugin & Runtime Fixes and Improvements

## 0.2.0

### Minor Changes

- 06b544f: 0.2.0: Architectural Rewrite

  - Refactored the entire routing system to be more modular and flexible.
  - Renamed packages to be more consistent and descriptive.
  - Segregated ctx and state into request, state, and context facets.
  - Taser is now a Router-Only package and can have many runtimes.
  - It is not trying to be a Backend Framework beyond the scope of the router.

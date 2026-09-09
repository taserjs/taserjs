# Taser.js Architecture

Type-safe, file-based routing and middleware composition engine backed by Hono.

## Language

**Router**:
The type-safe builder and composer for routes, schemas, and cascading middlewares.
_Avoid_: Server, engine, framework

**Runtime**:
The execution layer that consumes the route manifest, registers handlers and middlewares onto a Hono instance, and wires execution context.
_Avoid_: Server host, HTTP handler, listener

**TaserApp**:
The configured Hono application instance compiled and returned by `createTaserApp()`.
_Avoid_: Server instance, express app

**TaserDefinition**:
The declarative, uninstantiated application configuration created via `defineTaser()` capturing base path, application context, not-found handlers, and error handlers without loading or creating a server instance.
_Avoid_: App config, server options, app instance

**Generated Runtime Entry**:
The generated module emitted at `src/.taserjs/routes.gen.ts` that imports the application definition from `src/taser.ts`, compiles the routing pipeline via `createTaserApp(routeManifest, taser)`, exports the runnable Hono `app`, and augments ambient router types.
_Avoid_: Virtual entry, bundle output, main entry, routes.d.ts

**Request Facet (`req`)**:
The HTTP-specific input container holding validated params, query, body, headers, and the raw fetch Request.
_Avoid_: HTTP context, payload, request object

**Application Context (`ctx`)**:
Global singletons and long-lived services defined at startup via `createContext()`.
_Avoid_: App state, global state, singletons

**Middleware State (`state`)**:
Request-scoped values accumulated down the directory layout hierarchy via `next({ ... })`.
_Avoid_: Session data, local state, context

**Manifest**:
The static TypeScript file structure emitted by `@taserjs/plugin` into `.taserjs/routes.gen.ts` describing all discovered routes, layouts, and handlers.
_Avoid_: Virtual module, route registry, routing table, split dts

**AppManifest**:
The composite manifest type combining both `RouteManifest` and `LayoutManifest` exported from `routes.gen.ts`, used by `@taserjs/client` to construct type-safe RPC proxies and statically infer route input/output across the entire middleware layout hierarchy.
_Avoid_: Manifest schema, client types, route table

**Composed Handler**:
The single composite route handler per endpoint compiled at registration time that executes the onion pipeline (cascading layouts, route schemas, route middleware, and terminal handler) before returning a Web Response to Hono.
_Avoid_: Route wrapper, Hono callback, route pipeline

**Provided Service (`next.provide`)**:
A dynamic helper, service, or client instance (such as `cookies`) injected by upstream middleware into downstream handlers as top-level destructured sibling arguments, distinct from serializable data state.
_Avoid_: Global plugin, ambient context, middleware state

**Hono Adapter (`t.hono`)**:
The fluent adapter function wrapping native Hono `(c, next) => ...` middleware into Taser-compatible onion layers.
_Avoid_: honoMw, bridge, compat wrapper

**Taser Config (`taserjs.config.ts`)**:
The dedicated root configuration file defining filesystem routing directories, manifest output paths, formatting, and file extensions for CLI and bundler plugins.
_Avoid_: vite.config routing options, nitro options, bundler options, taser.config.ts

**Hono Context Escape Hatch (`ctx.context`)**:
The runtime attachment of Hono's native `Context` (`c`) onto `ctx` as `ctx.context`, intentionally omitted from ambient TypeScript definitions so end users remain unaware while library authors can access underlying engine primitives via manual assertion.
_Avoid_: c, ctx._c, ctx.raw, honoInstance

**Escaped Segment (`[...]`)**:
A route filename segment wrapped in brackets (such as `[.]` or `[_]`) to treat special routing characters as literal characters in the URL rather than triggering route separators or conventions.
_Avoid_: literal path, quoted segment

**Canonical URL Pattern**:
The standard Hono-compatible path pattern (e.g. `/users/:id`, `/files/*`, `/sitemap.xml`) used as the `path` argument in `t.get()` / `t.post()`, in route manifests, and in HTTP dispatch.
_Avoid_: filesystem pattern, file path, route key

**Filesystem Route Pattern**:
The OS-compatible file and directory naming convention (e.g. `users/$id.get.ts`, `files/$.get.ts`, `sitemap[.]xml.get.ts`) used on disk to avoid OS filename limitations (such as forbidden `:` characters on Windows). Dynamic parameters use `$param` and splats/wildcards use `$` (e.g. `$.get.ts`).
_Avoid_: URL pattern, endpoint path, route pattern, [...slug]

**Route File**:
A source file distinguished by an HTTP verb suffix (`.<verb>.ts` or `.<verb>.tsx`) that defines an HTTP endpoint. It must export default a route definition matching the filename verb (`export default t.<verb>(...)`).
_Avoid_: endpoint file, handler file, API file

**Layout File**:
A source file without an HTTP verb suffix (e.g. `$.ts`, `admin.ts`, `_auth.ts`, `admin/$.ts`) that defines middleware and state wrapping an entire tree segment. It must export default a layout definition (`export default t.layout(...)`).
_Avoid_: middleware file, wrapper file, layout component

**Layout Scope**:
The cascading boundary of a layout file, wrapping the entire tree segment including both the segment root endpoint (e.g. `GET /admin`) and all nested child routes (`/admin/*`).
_Avoid_: directory scope, path prefix boundary

**Sibling Layout vs. Nested Layout**:
A directory-scoped layout defined alongside its directory as `<segment>.ts` (sibling) vs. inside the directory as `<segment>/$.ts` (nested). Both resolve to the same segment layout; defining both for the same segment is a build-stopping collision error.
_Avoid_: external layout, inner layout

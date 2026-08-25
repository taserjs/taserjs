# @taserjs/router-plugin

File-system routing and framework adapters for Taser apps.

| Import                         | Purpose                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| `@taserjs/router-plugin/vite`  | Vite plugin (`taser()`) — standalone srvx serving or chained with `nitro/vite`         |
| `@taserjs/router-plugin/next`  | Next.js App Router adapter (`withTaser`) — materializes generated modules to `.taser/` |
| `@taserjs/router-plugin/nitro` | Standalone Nitro module for `nitro.config.ts`                                          |

## Installation

```sh
pnpm add -D @taserjs/router-plugin
```

Peer dependencies per entry:

- `/vite` — requires `vite` (v5–v8)
- `/next` — requires `next` >= 15
- `/nitro` — requires `nitro` v3

## Vite

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import { taser } from "@taserjs/router-plugin/vite";

export default defineConfig({
  plugins: [taser(), nitro()],
});
```

Expected project shape:

```
src/
  taser.ts        # your Taser app instance
  routes/         # file-system routes — see https://taserjs.dev/docs
  server.ts       # optional host app (see below)
```

```sh
vite          # dev
vite build    # build (Nitro produces the deployable output)
```

Running without the `nitro()` plugin enables **standalone mode**: Taser serves
dev requests through its built-in srvx server and bundles a self-contained
production entry you run directly.

## Next.js

```ts
// next.config.ts
import { withTaser } from "@taserjs/router-plugin/next";

export default withTaser({
  // basePath: "/app",  ← inherited automatically if set on this config
});
```

Mount a catch-all route that forwards requests to Taser:

```ts
// app/[[...slug]]/route.ts
import { taserApp } from "../.taser/app";

const handle = (request: Request) => taserApp.fetch(request);

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
```

Generated artifacts land in `.taser/` and are rewritten automatically while
`next dev` is running.

## Nitro

```ts
// nitro.config.ts
import { taser } from "@taserjs/router-plugin/nitro";

export default defineNitroConfig({
  modules: [taser()],
});
```

By default (`standalone: true`) Taser replaces Nitro's routing engine entirely
while keeping Nitro's deploy targets. Set `standalone: false` to keep the full
Nitro runtime (plugins, middleware, route rules) and register Taser as a
catch-all handler within it.

## Options

All adapters share the same base options. Adapter-specific options are listed
separately. Unspecified options fall back to their defaults.

### Shared

| Option        | Type                   | Default           | Description                                                     |
| ------------- | ---------------------- | ----------------- | --------------------------------------------------------------- |
| `rootDir`     | `string`               | current directory | Project root used to resolve all other paths.                   |
| `serverDir`   | `string`               | `"src"`           | Directory containing your app code.                             |
| `entry`       | `string`               | `"taser.ts"`      | Taser app module, resolved relative to `serverDir`.             |
| `routesDir`   | `string`               | `"routes"`        | Route files directory, resolved relative to `serverDir`.        |
| `serverEntry` | `string`               | auto-detected     | Host app entry; defaults to `server.ts`, then `server.node.ts`. |
| `basePath`    | `string`               | —                 | URL scope Taser dispatches under.                               |
| `ignore`      | `string[]`             | `["**/-*"]`       | Glob patterns for route files to skip.                          |
| `quotes`      | `"single" \| "double"` | `"single"`        | Quote style of generated code.                                  |
| `semi`        | `boolean`              | `false`           | Semicolons in generated code.                                   |
| `format`      | `boolean`              | `true`            | Format generated code.                                          |
| `validate`    | `boolean`              | `true`            | Validate route module exports during scanning.                  |

### Vite (`/vite`)

| Option       | Type      | Default             | Description                                                               |
| ------------ | --------- | ------------------- | ------------------------------------------------------------------------- |
| `server`     | `boolean` | `true`              | Built-in dev serving + production entry in standalone mode.               |
| `port`       | `number`  | `$PORT` \|\| `3000` | Standalone dev/prod port.                                                 |
| `standalone` | `boolean` | `true`              | When using Nitro, replace its engine instead of registering as a handler. |

### Next (`/next`)

| Option     | Type             | Default              | Description                                         |
| ---------- | ---------------- | -------------------- | --------------------------------------------------- |
| `outDir`   | `string`         | `".taser"`           | Where generated artifacts are written.              |
| `basePath` | `string`         | next config's value  | URL scope override; inherits `basePath` by default. |
| `watcher`  | `{ debounceMs }` | `{ debounceMs: 50 }` | Route watcher tuning.                               |

### Nitro (`/nitro`)

| Option       | Type      | Default | Description                                                                |
| ------------ | --------- | ------- | -------------------------------------------------------------------------- |
| `standalone` | `boolean` | `true`  | Replace Nitro's engine, or register as one handler inside it when `false`. |

## Using Taser in an existing application

Taser can sit in front of an app you already have. Create a host entry at
`src/server.ts` (fetch-style runtimes) or `src/server.node.ts`
(Node-style frameworks) — it is picked up automatically, or point at it
explicitly with the `serverEntry` option.

Dispatch order: **your routes here → Taser routes first**; any request Taser
does not claim falls through to your app; unmatched everywhere returns a 404.

The default export may take any of these shapes:

```ts
// Hono — fetch-native, used directly.
export default app;
```

```ts
// Express — bare Node-style app, bridged automatically.
export default app;
```

```ts
// Fastify — export the raw handler once the app is ready.
await app.ready();
export default app.routing;
```

An explicit form is also accepted:

```ts
export default { fetch: handler }; // fetch function
export default { node: handler }; // raw (req, res) function or pre-converted
```

Notes:

- Node-style hosts must complete their own startup before export (e.g.
  `await app.ready()`).
- Bridging uses `srvx/node`'s `toFetchHandler`, loaded only when needed.
  Node runtime only — consistent with Express/Fastify being restricted to
  Node deploy targets.

## Generated files

Everything is written to `.taser/` (gitignore it):

- `.taser/types/` — ambient route types, always generated
- `.taser/app.ts`, `.taser/entry.ts`, `.taser/manifest.ts` — Next.js only
- `.taser/serve.mjs` — production server entry, standalone Vite mode only

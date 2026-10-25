# Framework & Host Integrations

Read when mounting Taser.js inside fullstack frameworks (Next.js, TanStack Start, React Router, Nuxt, SvelteKit, Vite SPA) or host servers (Express, Fastify, Hono, Elysia).

## Overview

Taser.js integrates into fullstack frameworks by exporting a catch-all route handler that delegates requests to the compiled `app` (`routes.gen.ts`). When deployed with host servers, Taser mounts ahead of the host, allowing unmatched requests to fall through.

---

## Fullstack Frameworks

### 1. Next.js (App Router)

Install `@taserjs/plugin` and wrap `next.config.ts`:

```ts
// next.config.ts
import { createTaser } from "@taserjs/plugin/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // your next config options
};

export default createTaser()(nextConfig);
```

Configure `taserjs.config.ts`:

```ts
import { defineConfig } from "@taserjs/cli";

export default defineConfig({
  serverDir: "src/server",
});
```

Mount the catch-all Route Handler in Next.js:

```ts
// src/app/api/[[...slug]]/route.ts
import { app } from "@/server/.taserjs/routes.gen";

const handle = (request: Request) => app.fetch(request);

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
```

---

### 2. TanStack Start

Taser.js automatically detects TanStack Start in `vite.config.ts` (`plugins: [taser()]`):

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/start/vite";
import { taser } from "@taserjs/plugin/vite";

export default defineConfig({
  plugins: [taser(), tanstackStart()],
});
```

Mount the API route in TanStack Start:

```tsx
// src/routes/api/$.tsx
// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { app } from "../../server/.taserjs/routes.gen";

const handle = ({ request }: { request: Request }) => app.fetch(request);

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
      OPTIONS: handle,
      HEAD: handle,
    },
  },
});
```

---

### 3. React Router

Add `taser()` to `vite.config.ts`:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import { taser } from "@taserjs/plugin/vite";

export default defineConfig({
  plugins: [reactRouter(), taser()],
});
```

Mount a resource route:

```ts
// app/routes/api.ts
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { app } from "../server/.taserjs/routes.gen";

const handle = ({ request }: LoaderFunctionArgs | ActionFunctionArgs) => app.fetch(request);

export const loader = handle;
export const action = handle;
```

Register the resource route in `app/routes.ts`:

```ts
// app/routes.ts
import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  // ...other routes
  route("api/*", "routes/api.ts"),
] satisfies RouteConfig;
```

---

### 4. Nuxt

Nuxt scans `server/` and `app/`, so Taser.js sets `serverDir: "api"` in `taserjs.config.ts` to prevent collisions:

```ts
// taserjs.config.ts
import { defineConfig } from "@taserjs/cli";

export default defineConfig({
  serverDir: "api",
});
```

Add `taser()` in `nuxt.config.ts`:

```ts
// nuxt.config.ts
import { taser } from "@taserjs/plugin/vite";

export default defineNuxtConfig({
  vite: {
    plugins: [taser()],
  },
});
```

Mount Nitro event handlers in Nuxt:

```ts
// server/api/[...slug].ts
import { app } from "../../api/.taserjs/routes.gen";

export default defineEventHandler((event) => app.fetch(toWebRequest(event)));
```

```ts
// server/api/index.ts
export { default } from "./[...slug]";
```

---

### 5. SvelteKit

Add `taser()` to `vite.config.ts`:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { taser } from "@taserjs/plugin/vite";

export default defineConfig({
  plugins: [sveltekit(), taser()],
});
```

Mount the fallback handler:

```ts
// src/routes/api/[...path]/+server.ts
import type { RequestHandler } from "./$types";
import { app } from "../../../server/.taserjs/routes.gen";

export const fallback: RequestHandler = ({ request }) => app.fetch(request);
```

---

### 6. Vite SPA (`--framework vite`)

In a Vite Single Page App (React, Vue, Svelte, Solid, Preact), Vite serves client assets while Taser runs alongside Vite's dev server:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { taser } from "@taserjs/plugin/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [taser({ standalone: false }), react(), nitro()],
});
```

---

## Host Server Pass-Through

When hosting Taser inside an existing backend server, place the host entry file in `${serverDir}`:

- `server.node.ts` (or `.js`) for Node runtime hosts (Express, Fastify).
- `server.ts` (or `.js`) for Fetch runtime hosts (Hono, Elysia).

Taser mounts ahead of the host server. Requests matched by Taser endpoints are answered immediately; unmatched requests fall through to the host.

### Express (`src/server.node.ts`)

```ts
import express from "express";

const app = express();
app.use(express.json());

// Existing legacy routes
app.get("/legacy/info", (_req, res) => {
  res.json({ system: "Express", status: "online" });
});

export default app;
```

### Fastify (`src/server.node.ts`)

Fastify requires awaiting `app.ready()` and exporting `app.routing`:

```ts
import Fastify from "fastify";

const app = Fastify();

app.get("/legacy/info", async () => ({
  system: "Fastify",
  status: "online",
}));

await app.ready();

export default app.routing;
```

### Hono (`src/server.ts`)

```ts
import { Hono } from "hono";

const app = new Hono();

app.get("/legacy/info", (c) =>
  c.json({
    system: "Hono",
    status: "online",
  }),
);

export default app;
```

### Elysia (`src/server.ts`)

```ts
import { Elysia } from "elysia";

const app = new Elysia().get("/legacy/info", () => ({
  system: "Elysia",
  status: "online",
}));

export default app;
```

---

## Verify

1. Run `pnpm dev` to start the development server.
2. Verify that Taser routes respond:
   ```bash
   curl -i http://localhost:3000/api/users
   ```
3. For host pass-through, verify that legacy routes respond:
   ```bash
   curl -i http://localhost:3000/legacy/info
   ```

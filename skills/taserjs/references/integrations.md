# TaserJS Fullstack & Framework Integrations

This guide details how to integrate TaserJS into fullstack frameworks (Next.js, TanStack Start) and host servers (Express, Hono, Fastify).

> For migration assessments and converting legacy route handlers to TaserJS, see [references/migration.md](migration.md).

---

## 1. Next.js App Router Integration

Embed a type-safe file-based REST API subsystem under `/api` in Next.js 15+.

### 1. Install Dependencies

```bash
pnpm add @taserjs/router @taserjs/router-client zod
pnpm add -D @taserjs/router-plugin
```

### 2. Configure `next.config.ts`

Wrap your Next.js config using `createTaser` from `@taserjs/router-plugin/next`:

```ts
// next.config.ts
import type { NextConfig } from "next";
import { createTaser } from "@taserjs/router-plugin/next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

const withTaser = createTaser({
  serverDir: "src/server", // Directory containing Taser routes & config
  basePath: "/api", // URL prefix dispatched to Taser
});

export default withTaser(nextConfig);
```

### 3. Update `tsconfig.json`

Add `@/.taser/*` path aliases and include `.taser` artifacts:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/.taser/*": ["./.taser/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".taser/**/*.ts", ".taser/**/*.d.ts"]
}
```

### 4. Initialize Router Instance

Create `src/server/taser.ts`:

```ts
// src/server/taser.ts
import { createTaserApp } from "@taserjs/router";
import { notFound } from "@taserjs/router/reply";

export default createTaserApp({
  response: { validate: true },
}).notFound(() => notFound({ message: "Not Found" }));
```

### 5. Create Catch-All Route Handler

Create `src/app/api/[[...slug]]/route.ts`:

```ts
// src/app/api/[[...slug]]/route.ts
import { app } from "@/.taser/entry";

const handle = (request: Request) => app.fetch(request);

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
export const OPTIONS = handle;
export const HEAD = handle;
```

### 6. Create API Routes

Define REST endpoints inside `src/server/routes/`:

- `src/server/routes/$.ts` (Root layout)
- `src/server/routes/users.get.ts` (`GET /api/users`)
- `src/server/routes/users/$id.get.ts` (`GET /api/users/:id`)

---

## 2. TanStack Start Integration

Run a dedicated Taser REST API subsystem alongside TanStack Router UI pages.

### 1. Install Dependencies

```bash
pnpm add @taserjs/router @taserjs/router-client zod
pnpm add -D @taserjs/router-plugin
```

### 2. Configure `vite.config.ts`

Add `taser()` before `tanstackStart()` with `server: false`:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { taser } from "@taserjs/router-plugin/vite";

export default defineConfig({
  plugins: [
    taser({
      serverDir: "src/server", // Houses Taser context & routes
      basePath: "/api", // URL prefix dispatched to Taser
      server: false, // Let TanStack Start manage the outer HTTP host; Taser handles /api routes only
    }),
    tanstackStart(),
    viteReact(),
  ],
});
```

### 3. Update `tsconfig.json`

Include `.taser/types/**/*.d.ts`:

```json
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src", ".taser/types/**/*.d.ts", "vite.config.ts"]
}
```

### 4. Initialize Router Instance

Create `src/server/taser.ts`:

```ts
// src/server/taser.ts
import { createTaserApp } from "@taserjs/router";
import { notFound } from "@taserjs/router/reply";

export default createTaserApp({
  response: { validate: true },
}).notFound(() => notFound({ message: "Not Found" }));
```

### 5. Create TanStack Start Catch-All Route

Create `src/routes/api/$.tsx` using TanStack Router server handlers:

```tsx
// src/routes/api/$.tsx
import { createFileRoute } from "@tanstack/react-router";
import { app } from "#taserjs/virtual/entry";

const handle = async ({ request }: { request: Request }) => app.fetch(request);

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
      PUT: handle,
      DELETE: handle,
      PATCH: handle,
      OPTIONS: handle,
      HEAD: handle,
    },
  },
});
```

### 6. Create API Routes

Add routes to `src/server/routes/` (e.g. `src/server/routes/products.get.ts` -> `GET /api/products`).

---

## 3. Host Pass-Through Architecture

Taser co-exists with existing host servers via zero-downtime pass-through:

```text
[Incoming Request] -> [Taser Routes Check] -> [Host App Fallback] -> [404 Finalizer]
```

### Web Standard Hosts (Hono, Elysia)

Create `src/server.ts` exporting your host application:

```ts
// src/server.ts
import { Hono } from "hono";

const app = new Hono();
app.get("/legacy-hono", (c) => c.text("Handled by Hono"));

export default app;
```

### Node.js Hosts (Express, Fastify)

Create `src/server.node.ts` exporting your Node HTTP request listener:

```ts
// src/server.node.ts
import express from "express";

const app = express();
app.use(express.json());

app.get("/legacy-express", (req, res) => {
  res.json({ message: "Handled by legacy Express controller" });
});

export default app;
```

- Requests matching `src/routes/*` run through Taser with zero overhead.
- Unmatched requests fall through to Express/Hono with existing middleware and session state preserved.

# Taser.js Fullstack & Framework Integrations

This guide details how to integrate Taser.js into fullstack frameworks (Next.js, TanStack Start) and host servers (Express, Hono, Fastify).

> For migration assessments, see [references/migration.md](migration.md).

---

## 1. Next.js App Router Integration

Embed a type-safe file-based REST API under `/api` in Next.js 15+.

### 1. Install Dependencies

```bash
pnpm add @taserjs/router @taserjs/client zod
pnpm add -D @taserjs/plugin @taserjs/cli
```

### 2. Configure `taserjs.config.ts` and `next.config.ts`

```ts
// taserjs.config.ts
import { defineConfig } from "@taserjs/cli";

export default defineConfig({
  serverDir: "src/server",
  routesDir: "routes",
  outputDir: ".taserjs",
  app: "taser.ts",
});
```

```ts
// next.config.ts
import type { NextConfig } from "next";
import { createTaser } from "@taserjs/plugin/next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

const withTaser = createTaser(); // options: cwd?, config? only

export default withTaser(nextConfig);
```

### 3. Update `tsconfig.json`

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "src/**/*", "**/*.ts", "**/*.tsx"]
}
```

`src/**/*` covers `src/server/.taserjs/routes.gen.ts`.

### 4. App Definition

```ts
// src/server/taser.ts
import { defineTaser } from "@taserjs/router";
import { notFound } from "@taserjs/router/reply";

export default defineTaser({
  response: { validate: true },
})
  .basePath("/api")
  .notFound(() => notFound({ message: "Not Found" }));
```

### 5. Catch-All Route Handler

```ts
// src/app/api/[[...slug]]/route.ts
import { app } from "@/server/.taserjs/routes.gen";

const handle = (request: Request) => app.fetch(request);

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
export const OPTIONS = handle;
```

### 6. API Routes

- `src/server/routes/$.ts` (root layout; mount `cookie()` here if needed)
- `src/server/routes/users.get.ts` → `GET /api/users`
- `src/server/routes/users/$id.get.ts` → `GET /api/users/:id`

---

## 2. TanStack Start Integration

### 1. Install Dependencies

```bash
pnpm add @taserjs/router @taserjs/client zod
pnpm add -D @taserjs/plugin @taserjs/cli
```

### 2. Configure Vite + config

```ts
// taserjs.config.ts
import { defineConfig } from "@taserjs/cli";

export default defineConfig({
  serverDir: "src/server",
  routesDir: "routes",
  outputDir: ".taserjs",
  app: "taser.ts",
});
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { taser } from "@taserjs/plugin/vite";

export default defineConfig({
  plugins: [
    taser({
      server: false,
      config: "./taserjs.config.ts",
    }),
    tanstackStart(),
    viteReact(),
  ],
});
```

### 3. `tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*", "vite.config.ts", "taserjs.config.ts"]
}
```

### 4. App Definition

```ts
// src/server/taser.ts
import { defineTaser } from "@taserjs/router";
import { notFound } from "@taserjs/router/reply";

export default defineTaser({
  response: { validate: true },
})
  .basePath("/api")
  .notFound(() => notFound({ message: "Not Found" }));
```

### 5. TanStack Start Catch-All

```tsx
// src/routes/api/$.tsx
import { createFileRoute } from "@tanstack/react-router";
import { app } from "../../server/.taserjs/routes.gen";

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
    },
  },
});
```

### 6. API Routes

Add routes under `src/server/routes/` (e.g. `products.get.ts` → `GET /api/products`).

---

## 3. Host Pass-Through Architecture

```text
[Incoming Request] -> [Taser.js Routes Check] -> [Host App Fallback] -> [404 Finalizer]
```

### Web Standard Hosts (Hono, Elysia)

```ts
// src/server.ts
import { Hono } from "hono";

const app = new Hono();
app.get("/legacy-hono", (c) => c.text("Handled by Hono"));

export default app;
```

### Node.js Hosts (Express, Fastify)

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

Matching `src/routes/*` run through Taser.js; unmatched requests fall through to the host.

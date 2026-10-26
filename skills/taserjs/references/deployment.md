# Production Deployment & Nitro Presets

Read when building for production, selecting Nitro deployment presets, configuring build targets, or writing container/server start scripts.

## Deployment Architecture

Taser.js builds production bundles using Nitro. In standalone and SPA modes, `vite build` produces a self-contained `.output/` directory tailored to your target infrastructure.

## Selecting a Nitro Preset

Specify the target preset in `nitro.config.ts` or during project scaffolding via `--preset`:

```ts
// nitro.config.ts
import { defineConfig } from "nitro/config";

export default defineConfig({
  preset: "node-server", // Default preset
});
```

### Supported Presets

| Preset              | Target Platform                      | Runtime          | Start Command                   |
| :------------------ | :----------------------------------- | :--------------- | :------------------------------ |
| `node-server`       | Docker, VPS, Render, Railway, Fly.io | Node.js >= 20.19 | `node .output/server/index.mjs` |
| `cloudflare-module` | Cloudflare Workers                   | workerd (Edge)   | Deployed via Wrangler           |
| `vercel`            | Vercel Serverless                    | Node.js / Edge   | Deployed via Vercel CLI         |
| `netlify`           | Netlify Functions                    | Node.js / Edge   | Deployed via Netlify CLI        |
| `aws-lambda`        | AWS Lambda HTTP API                  | Node.js          | Deployed via SAM/CDK/Serverless |

> [!WARNING]
> `cloudflare-module` runs on `workerd`, which lacks the Node.js internals required by Express and Fastify. When deploying to Cloudflare Workers, use standalone Taser or a Fetch-based host (Hono, Elysia).

## Build & Output Structure

Run the build command:

```bash
pnpm build
```

Build artifacts are generated in `.output/`:

```text
.output/
├── server/
│   ├── index.mjs           # Entry point for Node.js / serverless handler
│   ├── _chunks/
│   └── _libs/
└── public/                 # Static assets (in Vite SPA projects)
```

## Production Start Command

For self-hosted Node.js deployments (`node-server`):

```bash
node .output/server/index.mjs
```

Or run via `package.json`:

```bash
pnpm start
```

## Docker Containerization Example

Multi-stage `Dockerfile` for `node-server`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/.output .output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

## Verify

1. Run `pnpm build`.
2. Verify that `.output/server/index.mjs` was created.
3. Start the production bundle locally:
   ```bash
   node .output/server/index.mjs
   ```
4. Confirm health check responds on `http://localhost:3000/`.

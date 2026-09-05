# Taser.js Setup & Configuration

This guide covers bootstrapping a new Taser.js project and configuring entry, context, and router instances in an existing project.

---

## 1. Creating a New Project

New projects fall into two primary categories:

### A. Standalone Backend API Project

Use `create-taserjs` to scaffold a standalone TypeScript API project:

```bash
# Interactive scaffolding
pnpm create taserjs@latest my-api

# Non-interactive with flags
pnpm create taserjs@latest my-api \
  --framework none \
  --preset node-server \
  --db drizzle:postgres \
  --validator zod \
  --logger pino \
  -y
```

Available flags for `create-taserjs`:

- `--framework`: Host framework (`none`, `hono`, `express`, `fastify`). Default: `none`.
- `--preset`, `-p`: Deployment target / Nitro preset (`none`, `node-server`, `node-cluster`, `bun`, `deno-server`, `deno-deploy`, `cloudflare-module`, `vercel`, `aws-lambda`, `netlify`). Default: `node-server`.
- `--runtime`: Runtime override for self-hosted targets (`node`, `bun`, `deno`).
- `--db`: Database ODM and driver using `odm:driver` syntax (ODMs: `drizzle`, `prisma`, `kysely`; drivers: `sqlite`, `postgres`, `mysql`, e.g. `drizzle:postgres`).
- `--validator`: Schema validation library (`zod`, `arktype`, `valibot`).
- `--logger`: Structured logger integration (`pino`, `winston`). Omit to scaffold without a logger addon.
- `-y`, `--yes`: Skip interactive prompts and accept defaults for omitted options.
- `--json`: Output result as machine-readable JSON (or dumps capabilities catalog when invoked without a project name).

### B. Fullstack Frameworks (Next.js or TanStack Start)

1. Scaffold with the [Better T Stack CLI](https://www.better-t-stack.dev/docs/cli/agent-workflows) to generate a Next.js or TanStack Start app first.

2. Follow the manual setup guide for next steps [references/integrations.md](integrations.md).

---

## 2. Adding Taser.js to an Existing Project

### Manual Installation (Standalone Project)

1. Install dependencies:

   ```bash
   pnpm add @taserjs/router @taserjs/router-client zod
   pnpm add -D @taserjs/router-plugin vite @taserjs/router-cli
   ```

2. Configure `vite.config.ts`:

   ```ts
   // vite.config.ts
   import { defineConfig } from "vite";
   import { taser } from "@taserjs/router-plugin/vite";

   export default defineConfig({
     plugins: [taser()],
   });
   ```

3. Ensure `tsconfig.json` includes bundler/node16 module resolution and types:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "strict": true,
       "skipLibCheck": true
     },
     "include": ["src", ".taser/types/**/*.d.ts", "vite.config.ts"]
   }
   ```

---

## 3. Key Concepts: Entry & Context Files

### Entry File (`src/taser.ts` or `src/server/taser.ts`)

The entry file exports the main application instance configured via `createTaserApp`:

```ts
// src/taser.ts
import { createTaserApp } from "@taserjs/router";
import { notFound, internalServerError } from "@taserjs/router/reply";

export default createTaserApp({
  response: {
    validate: true, // Validate return schemas during development
  },
})
  .notFound(() => notFound({ message: "Resource not found" }))
  .onError((error) => {
    console.error("Unhandled error:", error);
    return internalServerError({ message: "Internal server error" });
  });
```

### Context File (`src/context.ts` or `src/server/context.ts`)

Taser.js uses `createContext` to manage application lifecycle singletons and request-scoped metadata:

```ts
// src/context.ts
import { createContext } from "@taserjs/router";

export const context = createContext({
  // Boot context: Initialized ONCE on app startup (singletons, DB pools, SDK clients)
  boot: async () => {
    const db = await createDatabasePool();
    return { db };
  },

  // Request context: Initialized for EVERY incoming request (requestId, auth tokens, timers)
  request: async ({ request }) => {
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
    const startTime = performance.now();
    return { requestId, startTime };
  },
});
```

### Context Rules & Anti-Patterns

- **Single Merged `ctx` Object**: In routes and middleware, `ctx` merges `boot` and `request` properties alongside framework utilities (`ctx.params`, `ctx.query`, `ctx.body`, `ctx.state`, `ctx.headers`, `ctx.cookies`).
- **Reserved Keys**: Do not use reserved property names (`headers`, `cookies`, `params`, `query`, `body`, `state`, `request`) as top-level keys in `boot` or `request`.
- **No Overwriting**: Do not overwrite keys declared in `boot` inside `request`.
- **Avoid Context Bloat**: Do not attach static utilities or helper functions to context if they can be imported directly inside route or middleware files.

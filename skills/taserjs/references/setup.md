# Taser.js Setup & Configuration

This guide covers bootstrapping a new Taser.js project and configuring entry, context, and router definitions.

---

## 1. Creating a New Project

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
2. Follow [references/integrations.md](integrations.md).

---

## 2. Adding Taser.js to an Existing Project

### Manual Installation (Standalone Project)

1. Install dependencies:

   ```bash
   pnpm add @taserjs/router @taserjs/client zod
   pnpm add -D @taserjs/plugin @taserjs/cli vite srvx
   ```

2. Add `taserjs.config.ts`:

   ```ts
   import { defineConfig } from "@taserjs/cli";

   export default defineConfig({
     serverDir: "src",
     routesDir: "routes",
     outputDir: ".taserjs",
     app: "taser.ts",
   });
   ```

3. Configure `vite.config.ts`:

   ```ts
   import { defineConfig } from "vite";
   import { taser } from "@taserjs/plugin/vite";

   export default defineConfig({
     plugins: [taser()],
   });
   ```

4. Ensure `tsconfig.json` includes sources (covers `src/.taserjs/**/*`):

   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "NodeNext",
       "moduleResolution": "NodeNext",
       "strict": true,
       "skipLibCheck": true
     },
     "include": ["src/**/*", "vite.config.ts", "taserjs.config.ts"]
   }
   ```

5. For standalone CI typecheck without Vite:

   ```json
   {
     "scripts": {
       "typecheck": "taser generate && tsc --noEmit"
     }
   }
   ```

---

## 3. Key Concepts: Entry & Context Files

### App Definition (`src/taser.ts` or `src/server/taser.ts`)

Export an uninstantiated definition with `defineTaser`. The compiled Hono `app` is emitted to `src/.taserjs/routes.gen.ts`:

```ts
// src/taser.ts
import { defineTaser } from "@taserjs/router";
import { notFound, internalServerError } from "@taserjs/router/reply";
import { context } from "./context";

export default defineTaser({
  response: {
    validate: true, // Validate return schemas during development
  },
})
  .context(context)
  .notFound(() => notFound({ message: "Resource not found" }))
  .onError((error) => {
    // Unhandled runtime crashes only (500). Validation / contract errors bypass onError.
    console.error("Unhandled error:", error);
    return internalServerError({ message: "Internal server error" });
  });
```

Use `.basePath("/api")` when the HTTP mount is not `/`. Do not put `basePath` on plugin options.

### Context File (`src/context.ts` or `src/server/context.ts`)

```ts
// src/context.ts
import { createContext } from "@taserjs/router";

export const context = createContext({
  boot: async () => {
    const db = await createDatabasePool();
    return { db };
  },
  request: async (req) => {
    const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
    const startTime = performance.now();
    return { requestId, startTime };
  },
});
```

### Context Rules & Anti-Patterns

- **Facet split**: Handlers receive `{ req, ctx, state, ...services }`. HTTP inputs live on `req`; singletons on `ctx`; cascaded middleware values on `state`.
- **Cookies**: Only after mounting `cookie()` middleware on an ancestor layout — then `{ cookies }` is a Cookie Jar Instance.
- **Reserved Keys**: Do not use reserved property names (`headers`, `cookies`, `params`, `query`, `body`, `state`, `request`) as top-level keys in `boot` or `request`.
- **No Overwriting**: Do not overwrite keys declared in `boot` inside `request`.
- **Avoid Context Bloat**: Do not attach static utilities to context if they can be imported directly.

# TaserJS Migration Playbook: Adopting Taser in Any Project

This playbook equips agents to assess any existing codebase (Express, Hono, Next.js, Fastify, or vanilla Node) and incrementally introduce or fully migrate to TaserJS with zero downtime.

> For complete framework configuration templates, see [references/integrations.md](integrations.md).

---

## 1. Project Assessment Checklist

Before modifying files, inspect the project environment:

1. **Framework**: Check `package.json` dependencies:
   - `express` / `fastify` -> Node host pass-through (`src/server.node.ts`)
   - `hono` / `elysia` -> Web Standard host pass-through (`src/server.ts`)
   - `next` -> Next.js App Router plugin (`@taserjs/router-plugin/next`)
   - `@tanstack/react-start` -> TanStack Start Vite integration
   - Pure API / Greenfield -> Standalone Taser with Vite/Nitro
2. **TypeScript**: Check `tsconfig.json`. Ensure `"moduleResolution": "bundler"` (or `"node16"` / `"nodenext"`) and path aliases.
3. **Package Manager**: Identify whether the project uses `pnpm`, `npm`, `yarn`, or `bun`.

---

## 2. Migration Strategies by Framework

### A. Migrating an Express Application (Zero Downtime)

Express projects use the **Host Pass-Through Architecture**. All existing routes, middleware, and sessions remain active while you write new endpoints in Taser.

1. **Install Dependencies**:
   ```bash
   pnpm add @taserjs/router @taserjs/router-client zod
   pnpm add -D @taserjs/router-plugin vite @taserjs/router-cli
   ```
2. **Export Express in `src/server.node.ts`**:
   Move your existing Express initialization and routes into `src/server.node.ts` (or export your existing Express instance).
3. **Configure `vite.config.ts`**:
   Add `taser()` plugin from `@taserjs/router-plugin/vite`.
4. **Create Root Layout & First Route**:
   - Create `src/routes/$.ts` (Root layout)
   - Create `src/routes/health.get.ts` (New Taser route)
5. **Verify**:
   - `GET /health` is handled by Taser.
   - Legacy routes (e.g. `GET /legacy/status`) fall through to Express.

### B. Migrating a Hono / Web Standard Application

1. Export your existing Hono application in `src/server.ts`.
2. Add new Taser routes in `src/routes/`.
3. Unmatched requests automatically fall through to your Hono instance.

### C. Migrating inside Next.js App Router

1. Follow the Next.js setup in [references/integrations.md#1-nextjs-app-router-integration](integrations.md#1-nextjs-app-router-integration).
2. Incrementally move Route Handlers (`app/api/users/route.ts`) to Taser route files (`src/server/routes/users.get.ts` and `src/server/routes/users.post.ts`).
3. Delete legacy `app/api/.../route.ts` files once migrated.

---

## 3. Converting Route Handlers: Step-by-Step

### Express / Hono -> Taser Handler Conversion Pattern

| Concept              | Express / Hono                               | TaserJS                                                                             |
| :------------------- | :------------------------------------------- | :---------------------------------------------------------------------------------- |
| **Path Params**      | `req.params.id` / `c.req.param("id")`        | `ctx.params.id` (inferred as string by default, or validated via `.params(schema)`) |
| **Query Params**     | `req.query.page` / `c.req.query("page")`     | `ctx.query.page` (via `.query(schema)`)                                             |
| **Request Body**     | `req.body` / `await c.req.json()`            | `ctx.body` (via `.body(schema)`)                                                    |
| **JSON Response**    | `res.json(data)` / `c.json(data)`            | `return json(data)` or `return reply.json(data)`                                    |
| **Status Codes**     | `res.status(404).json({ error })`            | `return notFound({ error })`                                                        |
| **Middleware State** | `req.user = user` / `c.set("user", user)`    | `return next({ user })` (merges into `ctx.state`)                                   |
| **Error Handling**   | `next(err)` / `throw new HTTPException(...)` | `return badRequest(...)` or throw standard error                                    |

### Example Conversion

#### Before (Express):

```ts
app.get("/users/:id", async (req, res) => {
  const user = await db.findUser(req.params.id);
  if (!user) return res.status(404).json({ message: "Not found" });
  res.json(user);
});
```

#### After (Taser `src/routes/users/$id.get.ts`):

```ts
// src/routes/users/$id.get.ts
import { json, notFound } from "@taserjs/router/reply";
import { t } from "@taserjs/router";
import { z } from "zod";

const GET = t.get("/users/:id").params(z.object({ id: z.string().uuid() }));

export default GET.handler(async (ctx) => {
  const user = await ctx.db.findUser(ctx.params.id);
  if (!user) return notFound({ message: "Not found" });
  return json(user);
});
```

---

## 4. Agent Verification & Launch Checklist

After making edits, the agent MUST run the following steps to verify the setup:

1. **Generate Types**: Run `pnpm dev` or `pnpm build` (or `npx @taserjs/router-cli generate`).
   - Check that `.taser/types/routes.d.ts` is generated.
2. **Typecheck**: Run `pnpm typecheck` or `npx tsc --noEmit`.
   - Ensure 0 errors across routes, layouts, and context.
3. **Endpoint Smoke Test**:
   - Start the server (`pnpm dev`).
   - `curl -i http://localhost:3000/<route>` to verify the Taser handler (prepend the configured `basePath`, e.g. `/api/<route>` when `basePath: "/api"`).
   - `curl -i http://localhost:3000/<legacy-route>` to verify the host pass-through fallback.

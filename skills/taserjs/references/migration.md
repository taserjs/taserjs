# Taser.js Migration Playbook: Adopting Taser.js in Any Project

This playbook equips agents to assess any existing codebase (Express, Hono, Next.js, Fastify, or vanilla Node) and incrementally introduce or fully migrate to Taser.js with zero downtime.

> For complete framework configuration templates, see [references/integrations.md](integrations.md).

---

## 1. Project Assessment Checklist

Before modifying files, inspect the project environment:

1. **Framework**: Check `package.json` dependencies:
   - `express` / `fastify` → Node host pass-through (`src/server.node.ts`)
   - `hono` / `elysia` → Web Standard host pass-through (`src/server.ts`)
   - `next` → Next.js App Router plugin (`@taserjs/plugin/next`)
   - `@tanstack/react-start` → TanStack Start Vite integration (`@taserjs/plugin/vite`)
   - Pure API / Greenfield → Standalone Taser.js with Vite/Nitro
2. **TypeScript**: Prefer `"moduleResolution": "NodeNext"` (or `"bundler"`) and `"include": ["src/**/*"]`.
3. **Package Manager**: Identify `pnpm`, `npm`, `yarn`, or `bun`.

---

## 2. Migration Strategies by Framework

### A. Migrating an Express Application (Zero Downtime)

1. **Install Dependencies**:
   ```bash
   pnpm add @taserjs/router @taserjs/client zod
   pnpm add -D @taserjs/plugin @taserjs/cli vite srvx
   ```
2. **Config**: Add `taserjs.config.ts` and `taser()` from `@taserjs/plugin/vite` in `vite.config.ts`.
3. **Export Express** in `src/server.node.ts`.
4. **Create** `src/taser.ts` with `defineTaser()`, `src/routes/$.ts`, and a first route (e.g. `health.get.ts`).
5. **Verify**:
   - `GET /health` → Taser.js
   - Legacy routes fall through to Express

### B. Migrating a Hono / Web Standard Application

1. Export the existing Hono app in `src/server.ts`.
2. Add Taser.js routes under `src/routes/`.
3. Unmatched requests fall through to Hono.

### C. Migrating inside Next.js App Router

1. Follow [integrations.md § Next.js](integrations.md#1-nextjs-app-router-integration).
2. Move Route Handlers (`app/api/users/route.ts`) to `src/server/routes/users.get.ts` / `users.post.ts`.
3. Delete legacy `app/api/.../route.ts` files once migrated.
4. Mount with `defineTaser().basePath("/api")`; keep paths in `taserjs.config.ts`.

---

## 3. Converting Route Handlers: Step-by-Step

| Concept              | Express / Hono                               | Taser.js                                                                            |
| :------------------- | :------------------------------------------- | :---------------------------------------------------------------------------------- |
| **Path Params**      | `req.params.id` / `c.req.param("id")`        | `req.params.id` (or `.params(schema)`) — Request Facet                              |
| **Query Params**     | `req.query.page` / `c.req.query("page")`     | `req.query.page` (via `.query(schema)`)                                             |
| **Request Body**     | `req.body` / `await c.req.json()`            | `req.body` (via `.body(schema)`)                                                    |
| **JSON Response**    | `res.json(data)` / `c.json(data)`            | `return json(data)`                                                                 |
| **Status Codes**     | `res.status(404).json({ error })`            | `return notFound({ error })`                                                        |
| **App Singletons**   | `app.locals` / modules                       | `ctx.db` via `createContext` Application Context                                    |
| **Middleware State** | `req.user = user` / `c.set("user", user)`    | `return next({ user })` → `state.user`                                              |
| **Error Handling**   | `next(err)` / `throw new HTTPException(...)` | `return badRequest(...)` or middleware `try/catch`                                  |
| **Cookies**          | `req.cookies` / cookie parsers               | Mount `cookie()` on a layout, then `{ cookies }`                                    |

### Example Conversion

#### Before (Express):

```ts
app.get("/users/:id", async (req, res) => {
  const user = await db.findUser(req.params.id);
  if (!user) return res.status(404).json({ message: "Not found" });
  res.json(user);
});
```

#### After (Taser.js `src/routes/users/$id.get.ts`):

```ts
import { json, notFound } from "@taserjs/router/reply";
import { t } from "@taserjs/router";
import { z } from "zod";

const GET = t.get("/users/:id").params(z.object({ id: z.string().uuid() }));

export default GET.handler(async ({ req, ctx }) => {
  const user = await ctx.db.findUser(req.params.id);
  if (!user) return notFound({ message: "Not found" });
  return json(user);
});
```

---

## 4. Agent Verification & Launch Checklist

1. **Generate Manifest**: `pnpm dev` / `pnpm build` (plugin) or `taser generate` / `npx @taserjs/cli generate`.
   - Confirm `${serverDir}/.taserjs/routes.gen.ts` exists (`app` + `AppManifest`).
   - Host imports: `import { app } from "@/server/.taserjs/routes.gen"` (Next) or `./.taserjs/routes.gen.js` (standalone). Ensure `tsconfig` `"include": ["src/**/*"]` and optional `"paths": { "@/*": ["./src/*"] }`.
2. **Typecheck**: `pnpm typecheck` or `taser generate && tsc --noEmit`.
3. **Smoke Test**:
   - `curl -i http://localhost:3000/<route>` (include `defineTaser().basePath(...)` prefix when set).
   - Verify host pass-through for unmatched legacy routes.

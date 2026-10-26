# Migration Playbook: Adopting Taser.js

Read when adopting Taser.js in existing Express, Hono, Fastify, or Next.js codebases, either incrementally via host pass-through or full rewrite.

## Migration Strategy: Zero-Downtime Host Pass-Through

Taser.js supports side-by-side incremental migration. By renaming your existing entry point to `server.node.ts` (Node runtime) or `server.ts` (Fetch runtime), Taser intercepts matching routes and forwards all legacy endpoints to your existing server.

```text
Incoming Request
      │
      ▼
┌──────────────┐      Matched
│   Taser.js   ├──────────────────► Execute Taser Route Handler
└──────┬───────┘
       │ Unmatched (Fall-through)
       ▼
┌──────────────┐
│  Host Server │──────────────────► Legacy Handler (Express / Fastify / Hono)
└──────────────┘
```

---

## Step 1: Set Up Host Pass-Through

Rename your existing server entry:

- Express or Fastify: `src/server.node.ts`
- Hono or Elysia: `src/server.ts`

Ensure the host file exports the app instance as `default`:

```ts
// src/server.node.ts (Express)
import express from "express";

const app = express();
app.use(express.json());

// Existing routes stay here during migration
app.get("/legacy/users", (req, res) => {
  res.json({ legacy: true });
});

export default app;
```

---

## Step 2: Handler Conversion Table

| Concept              | Express                    | Hono                       | Fastify                        | Taser.js                                                 |
| :------------------- | :------------------------- | :------------------------- | :----------------------------- | :------------------------------------------------------- |
| **Route Definition** | `app.get("/users/:id", h)` | `app.get("/users/:id", h)` | `fastify.get("/users/:id", h)` | `src/routes/users/$id.get.ts` with `t.get("/users/:id")` |
| **Path Params**      | `req.params.id`            | `c.req.param("id")`        | `req.params.id`                | `req.params.id` via `.params(schema)`                    |
| **Query Params**     | `req.query.page`           | `c.req.query("page")`      | `req.query.page`               | `req.query.page` via `.query(schema)`                    |
| **Request Body**     | `req.body`                 | `await c.req.json()`       | `req.body`                     | `req.body` via `.body(schema)`                           |
| **JSON Response**    | `res.json(data)`           | `c.json(data)`             | `reply.send(data)`             | `return json(data)` or `return ok(data)`                 |
| **Status Codes**     | `res.status(201).json(d)`  | `c.json(d, 201)`           | `reply.code(201).send(d)`      | `return created(data)`                                   |
| **Error Replies**    | `res.status(404).json(e)`  | `c.json(e, 404)`           | `reply.code(404).send(e)`      | `return notFound(data)`                                  |

---

## Step 3: Migration Recipes

### Express to Taser.js

#### Before (Express)

```ts
app.post("/users", async (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const user = await db.users.create({ email, name });
  return res.status(201).json(user);
});
```

#### After (Taser.js: `src/routes/users.post.ts`)

```ts
import { t } from "@taserjs/router";
import { created } from "@taserjs/router/reply";
import { z } from "zod";

export default t
  .post("/users")
  .body(
    z.object({
      email: z.string().email(),
      name: z.string().min(1),
    }),
  )
  .returns({
    201: z.object({ id: z.number(), email: z.string(), name: z.string() }),
  })
  .handler(async ({ req, ctx }) => {
    const user = await ctx.db.users.create(req.body);
    return created(user);
  });
```

---

### Hono to Taser.js

#### Before (Hono)

```ts
app.get("/items/:id", async (c) => {
  const id = c.req.param("id");
  const item = await getItem(id);
  if (!item) return c.json({ message: "Not found" }, 404);
  return c.json(item);
});
```

#### After (Taser.js: `src/routes/items/$id.get.ts`)

```ts
import { t } from "@taserjs/router";
import { json, notFound } from "@taserjs/router/reply";
import { z } from "zod";

export default t
  .get("/items/:id")
  .params(z.object({ id: z.string() }))
  .handler(async ({ req, ctx }) => {
    const item = await ctx.db.getItem(req.params.id);
    if (!item) return notFound({ message: "Not found" });
    return json(item);
  });
```

---

### Next.js Route Handlers to Taser.js

#### Before (`src/app/api/users/[id]/route.ts`)

```ts
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  return NextResponse.json({ id });
}
```

#### After (Taser.js: `src/server/routes/users/$id.get.ts`)

```ts
import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.get("/users/:id").handler(({ req }) => {
  return json({ id: req.params.id });
});
```

---

## Step 4: Middleware Conversion

### Before (Express Middleware)

```ts
function authMiddleware(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).send("Unauthorized");
  req.user = verifyToken(token);
  next();
}
```

### After (Taser Middleware)

```ts
import { middleware } from "@taserjs/router";
import { unauthorized } from "@taserjs/router/reply";

export const auth = middleware(async ({ req }, next) => {
  const token = req.headers.get("authorization");
  if (!token) return unauthorized({ message: "Unauthorized" });

  const user = verifyToken(token);
  return next({ user }); // Attached to `state.user` downstream
});
```

---

## Step 5: Final Cleanup

Once all legacy routes have been migrated to `${serverDir}/routes/`:

1. Remove `server.node.ts` or `server.ts`.
2. Uninstall legacy server dependencies (e.g. `pnpm remove express @types/express`).
3. Run `npx @taserjs/cli generate` and verify all endpoints are served natively by Taser.js.

---

## Verify

1. Run `pnpm dev`.
2. Verify migrated routes:
   ```bash
   curl -i http://localhost:3000/users/123
   ```
3. Verify unmigrated legacy routes still respond via host pass-through:
   ```bash
   curl -i http://localhost:3000/legacy/users
   ```

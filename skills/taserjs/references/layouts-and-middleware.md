# Taser.js Layouts & Middleware

This guide covers canonical layout identifiers, middleware types, first-party cookies, cascading state injection, and response transformation.

Handler and middleware arguments are facet-split: `{ req, ctx, state, ...services }` (see CONTEXT.md). Do not flatten params/query/body onto `ctx`.

---

## 1. Canonical Layout Identifiers

Layouts are non-verb files under `${serverDir}/routes`. Layout IDs use leading `/` and route-style syntax:

| File Location             | Canonical Layout ID | Declaration                             | Note                                     |
| :------------------------ | :------------------ | :-------------------------------------- | :--------------------------------------- |
| `src/routes/$.ts`         | `"/*"`              | `export default t.layout("/*")`         | Applies to all routes in the application |
| `src/routes/index.ts`     | `"/index"`          | `export default t.layout("/index")`     | Applies to `/` path only                 |
| `src/routes/admin.ts`     | `"/admin"`          | `export default t.layout("/admin")`     | Applies to `/admin` path only            |
| `src/routes/admin/$.ts`   | `"/admin/*"`        | `export default t.layout("/admin/*")`   | Applies to all routes under `/admin`     |
| `src/routes/tasks/$id.ts` | `"/tasks/:id"`      | `export default t.layout("/tasks/:id")` | Applies to specific task route           |
| `src/routes/_auth/$.ts`   | `"/_auth/*"`        | `export default t.layout("/_auth/*")`   | Applies to all routes under `/_auth`     |

---

## 2. First-Party Cookie Middleware

Cookies are not available until you mount `cookie()` from `@taserjs/router/middleware/cookie` on a layout. Handlers under that layout receive a Cookie Jar Instance as `{ cookies }`.

```ts
// src/routes/$.ts
import { cookie } from "@taserjs/router/middleware/cookie";
import { t } from "@taserjs/router";

export default t.layout("/*").use(
  cookie({
    secret: process.env.COOKIE_SECRET!,
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  }),
);
```

Scoped mount (only `/auth/*`):

```ts
// src/routes/auth.ts
import { cookie } from "@taserjs/router/middleware/cookie";
import { t } from "@taserjs/router";

export default t.layout("/auth/*").use(
  cookie({
    secret: process.env.COOKIE_SECRET!,
    path: "/auth",
  }),
);
```

```ts
// src/routes/me.get.ts
import { json } from "@taserjs/router/reply";
import { t } from "@taserjs/router";

export default t.get("/me").handler(({ cookies }) => {
  const theme = cookies.get("theme") ?? "light";
  return json({ theme });
});
```

---

## 3. Middleware Varieties

### A. Inline Middleware

```ts
.use(async ({ req }, next) => {
  console.log(`[${req.method}] ${req.url}`);
  return next();
})
```

### B. Reusable Standalone Middleware

```ts
import { t } from "@taserjs/router";
import { unauthorized } from "@taserjs/router/reply";

export const requireAuth = t.middleware(async ({ req, ctx }, next) => {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return unauthorized({ message: "Authorization token required" });

  const session = await ctx.db.verifySession(token);
  if (!session) return unauthorized({ message: "Invalid session" });

  return next({ user: session.user });
});
```

### C. Validation Middleware

```ts
import { t } from "@taserjs/router";
import { z } from "zod";

export const pagination = t.middleware().query(
  z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  }),
);
```

### D. Layout-Scoped & Union Middlewares

```ts
import { t } from "@taserjs/router";
import { forbidden } from "@taserjs/router/reply";

export const adminOnly = t.middleware("/admin", async ({ state }, next) => {
  if (state.adminUser.role !== "superadmin") {
    return forbidden({ message: "Superadmin role required" });
  }
  return next();
});

export const verifyTenant = t.middleware(["/member", "/admin"], async ({ req }, next) => {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return forbidden({ message: "Missing tenant identifier" });
  return next({ tenantId });
});
```

---

## 4. Cascading State via `return next({ ... })`

State merges into the `state` facet (not `ctx`):

```ts
// src/routes/admin.ts
import { t } from "@taserjs/router";
import { unauthorized } from "@taserjs/router/reply";

export default t.layout("/admin").use(async ({ req, ctx }, next) => {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return unauthorized({ message: "Admin authorization required" });

  const adminUser = await ctx.db.verifyAdmin(token);
  if (!adminUser) return unauthorized({ message: "Invalid admin token" });

  return next({ adminUser, role: "admin" as const });
});
```

---

## 5. Onion Architecture & Modifying Responses

1. Logic before `await next()` runs on the way in.
2. `const res = await next({ ... })` runs downstream and returns a Web `Response`.
3. Logic after `await next()` can inspect or mutate the response.

### Mutating Response Headers

```ts
.use(async (_args, next) => {
  const start = performance.now();
  const res = await next();
  const duration = (performance.now() - start).toFixed(2);
  res.headers.set("Server-Timing", `total;dur=${duration}`);
  return res;
})
```

### Centralized Validation Mapping in Middleware

`defineTaser().onError` does not receive `ValidationError`. Map it in middleware:

```ts
import { ValidationError } from "@taserjs/router";
import { unprocessableEntity, internalServerError } from "@taserjs/router/reply";

.use(async (_args, next) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof ValidationError) {
      return unprocessableEntity({ errors: error.issues });
    }
    console.error("Unhandled error caught in middleware:", error);
    return internalServerError({ message: "An unexpected error occurred" });
  }
})
```

## 6. Best Practices

- Put shared auth, cookies, and logging in layouts.
- Compose single-concern middleware.
- Pass cascaded data via `return next({ ... })` into `state`.

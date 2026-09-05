# TaserJS Layouts & Middleware

This guide covers canonical layout identifiers, middleware types, cascading state injection, and response transformation in TaserJS.

---

## 1. Canonical Layout Identifiers

Layouts are non-verb files located in the `src/routes/` directory. All layout identifiers strictly use leading slashes `/` and route-style path syntax (`/*`, `/:id`):

| File Location             | Canonical Layout ID | Declaration                             | Note                                     |
| :------------------------ | :------------------ | :-------------------------------------- | :--------------------------------------- |
| `src/routes/$.ts`         | `"/*"`              | `export default t.layout("/*")`         | Applies to all routes in the application |
| `src/routes/index.ts`     | `"/index"`          | `export default t.layout("/index")`     | Applies to `/` path only                 |
| `src/routes/admin.ts`     | `"/admin"`          | `export default t.layout("/admin")`     | Applies to `/admin` path only            |
| `src/routes/admin/$.ts`   | `"/admin/*"`        | `export default t.layout("/admin/*")`   | Applies to all routes under `/admin`     |
| `src/routes/tasks/$id.ts` | `"/tasks/:id"`      | `export default t.layout("/tasks/:id")` | Applies to specific task route           |
| `src/routes/_auth/$.ts`   | `"/_auth/*"`        | `export default t.layout("/_auth/*")`   | Applies to all routes under `/_auth`     |

---

## 2. Middleware Varieties

### A. Inline Middleware

Defined directly inside a layout or route chain via `.use()`:

```ts
// Inline middleware function
.use(async (ctx, next) => {
  console.log(`[${ctx.request.method}] ${ctx.request.url}`);
  return next();
})
```

### B. Reusable Standalone Middleware

Constructed with `t.middleware` (or `middleware` from `@taserjs/router`):

```ts
import { t } from "@taserjs/router";
import { unauthorized } from "@taserjs/router/reply";

export const requireAuth = t.middleware(async (ctx, next) => {
  const token = ctx.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return unauthorized({ message: "Authorization token required" });

  const session = await ctx.db.verifySession(token);
  if (!session) return unauthorized({ message: "Invalid session" });

  return next({ user: session.user });
});

// Attach to any layout or route:
// export default t.layout("/dashboard").use(requireAuth);
// export default t.get("/dashboard").use(requireAuth);
```

### C. Validation Middleware

Middlewares can validate contracts (query, params, body) and refine context downstream:

```ts
import { t } from "@taserjs/router";
import { z } from "zod";

export const pagination = t.middleware().query(
  z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  }),
);
// Handler is optional for validation-only middleware
```

### D. Layout-Scoped & Union Middlewares

When middleware requires typed state previously injected by a specific layout:

```ts
import { t } from "@taserjs/router";
import { forbidden } from "@taserjs/router/reply";

// Strictly bound to "/admin" layout: inherits ctx.state from "/admin"
export const adminOnly = t.middleware("/admin", async (ctx, next) => {
  if (ctx.state.adminUser.role !== "superadmin") {
    return forbidden({ message: "Superadmin role required" });
  }
  return next();
});

// Multi-branch union binding: inherits state from either "/member" or "/admin"
export const verifyTenant = t.middleware(["/member", "/admin"], async (ctx, next) => {
  const tenantId = ctx.headers.get("x-tenant-id");
  if (!tenantId) return forbidden({ message: "Missing tenant identifier" });
  return next({ tenantId });
});
```

---

## 3. Cascading State via `return next({ ... })`

State returned from `next({ ... })` is merged into `ctx.state` and cascades down to all child layouts and route handlers in the hierarchy:

```ts
// src/routes/admin.ts
import { t } from "@taserjs/router";
import { unauthorized } from "@taserjs/router/reply";

export default t.layout("/admin").use(async (ctx, next) => {
  const token = ctx.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return unauthorized({ message: "Admin authorization required" });

  const adminUser = await ctx.db.verifyAdmin(token);
  if (!adminUser) return unauthorized({ message: "Invalid admin token" });

  // Downstream /admin/* routes receive ctx.state.adminUser and ctx.state.role:
  return next({ adminUser, role: "admin" as const });
});
```

---

## 4. Onion Architecture & Modifying Responses

In TaserJS, middleware wraps downstream execution in an onion model:

1. Logic before `await next()` executes on the way in.
2. `const res = await next({ ... })` executes downstream handlers and returns the standard fetch `Response`.
3. Logic after `await next()` can inspect, modify, or wrap the response.

### Mutating Response Headers

```ts
.use(async (ctx, next) => {
  const start = performance.now();
  const res = await next();
  const duration = (performance.now() - start).toFixed(2);

  res.headers.set("Server-Timing", `total;dur=${duration}`);
  res.headers.set("X-Response-Time", `${duration}ms`);
  return res;
})
```

### Centralized Error Wrapping in Middleware

```ts
import { ValidationError } from "@taserjs/router";
import { unprocessableEntity, internalServerError } from "@taserjs/router/reply";

.use(async (ctx, next) => {
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

## 5. Best Practices

- **Use layouts for shared logic**: Place authentication, authorization, and common state injection in layouts to avoid repetition across routes.
- **Compose with single-concern middleware**: Chain focused middleware in layouts rather than combining unrelated logic in one unit.
- **Keep middleware focused**: Each middleware should do one thing (logging, validation, authentication).
- **Leverage cascading state**: Pass data via `ctx.state` and `return next({ ... })` instead of globals or bloated context.

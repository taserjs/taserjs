# Context & Middleware Architecture

Read when defining boot/request context, creating layouts, cascading `state`, managing cookies, or attaching built-in security and utility middleware.

## Context (`createContext`)

Context provides typed singletons and per-request metadata across all routes and middleware on the `ctx` facet.

```ts
// src/context.ts
import { createContext } from "@taserjs/router";
import { createDb } from "./db/index.js";
import { createLogger } from "./logger.js";

export const context = createContext({
  // boot: runs once during application startup. Takes NO arguments.
  boot: () => ({
    db: createDb(),
    logger: createLogger(),
  }),
  // request: runs on every incoming request.
  request: (req) => ({
    requestId: req.headers.get("x-request-id") ?? crypto.randomUUID(),
    startTime: Date.now(),
  }),
});

export type Context = typeof context.$Infer.Context;
```

Attach to the app definition:

```ts
// src/taser.ts
import { defineTaser } from "@taserjs/router";
import { context } from "./context.js";

export default defineTaser().context(context);
```

Access in handlers via `ctx`:

```ts
export default t.get("/health").handler(async ({ ctx }) => {
  ctx.logger.info({ requestId: ctx.requestId }, "Health check requested");
  return json({ ok: true });
});
```

## Layouts & Onion Middleware

Layouts apply middleware to every route in their subtree. Layout IDs must end with `/*`:

```ts
// src/routes/admin.ts (matches /admin/*)
import { t } from "@taserjs/router";
import { unauthorized } from "@taserjs/router/reply";

export default t.layout("/admin/*").use(async ({ req }, next) => {
  const token = req.headers.get("authorization");
  if (!token) {
    return unauthorized({ message: "Admin authorization required" });
  }

  // Pass downstream state to nested middleware and handlers
  const res = await next({ adminUser: { role: "admin" } });

  // Mutate response on the return pass (onion architecture)
  res.headers.set("x-role", "admin");
  return res;
});
```

## Creating Standalone Middleware

Create reusable middleware with `middleware()`:

```ts
// src/middleware/auth.ts
import { middleware } from "@taserjs/router";
import { unauthorized, forbidden } from "@taserjs/router/reply";

export interface User {
  id: string;
  role: "admin" | "user";
}

// Simple middleware extending state
export const requireUser = middleware(async ({ req }, next) => {
  const auth = req.headers.get("authorization");
  if (!auth) return unauthorized({ message: "Authentication required" });

  const user: User = { id: "123", role: "admin" };
  return next({ user });
});

// Middleware requiring prior state
export const requireAdmin = middleware()
  .requires<{ state: { user: User } }>()
  .handler(({ state }, next) => {
    if (state.user.role !== "admin") {
      return forbidden({ message: "Admins only" });
    }
    return next({ isAdmin: true as const });
  });
```

### Providing Services Directly (`next.provide`)

Middleware can expose top-level facet services directly onto handler arguments using `next.provide(services, state?)`:

```ts
export const traceService = middleware(async ({ req }, next) => {
  const tracer = { trace: (name: string) => console.log(`[Trace] ${name}`) };
  return next.provide({ tracer }, { tracedAt: Date.now() });
});

// Downstream handler consumes { tracer } directly:
// .handler(({ tracer, state }) => { tracer.trace("ping"); ... })
```

## Cookie Jar (`@taserjs/router/middleware/cookie`)

Cookies are not ambient; mount `cookie()` on a layout to inject the `{ cookies }` service into handlers:

```ts
// src/routes/$.ts
import { t } from "@taserjs/router";
import { cookie } from "@taserjs/router/middleware/cookie";

export default t.layout("/*").use(
  cookie({
    secret: process.env.COOKIE_SECRET ?? "dev-secret-32-chars-long!",
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
  }),
);
```

Consume `{ cookies }` in route handlers:

```ts
// src/routes/auth/session.post.ts
import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";

export default t.post("/auth/session").handler(async ({ cookies }) => {
  // Plain cookie
  cookies.set("theme", "dark", { maxAge: 86400 });

  // HMAC-signed cookie
  await cookies.setSigned("session_id", "sess_abc123");

  return json({ ok: true });
});

// src/routes/auth/session.get.ts
export default t.get("/auth/session").handler(async ({ cookies }) => {
  const theme = cookies.get("theme") ?? "light";
  const session = await cookies.getSigned("session_id");
  const allCookies = cookies.get();

  return json({ theme, session, allCookies });
});
```

## Built-In Middleware Reference

Import built-in middleware from `@taserjs/router/middleware/<name>`:

| Middleware      | Import Path                                 | Description                                        | Key Options                                                                           |
| :-------------- | :------------------------------------------ | :------------------------------------------------- | :------------------------------------------------------------------------------------ |
| `cookie`        | `@taserjs/router/middleware/cookie`         | Injects typed `{ cookies }` service                | `secret`, `httpOnly`, `secure`, `sameSite`, `path`, `domain`                          |
| `cors`          | `@taserjs/router/middleware/cors`           | Cross-Origin Resource Sharing                      | `origin`, `methods`, `allowHeaders`, `credentials`, `maxAge`                          |
| `jwt`           | `@taserjs/router/middleware/jwt`            | Verifies JWT and injects `state.jwtPayload`        | `secret` (required), `alg` (default `HS256`). Also exports `sign`, `verify`, `decode` |
| `jwk`           | `@taserjs/router/middleware/jwk`            | Verifies JWT against JWKS endpoint                 | `jwksUrl`                                                                             |
| `secureHeaders` | `@taserjs/router/middleware/secure-headers` | Sets OWASP security headers (HSTS, CSP, XFO, etc.) | Custom header overrides                                                               |
| `bodyLimit`     | `@taserjs/router/middleware/body-limit`     | Caps maximum request payload size                  | `maxSize: number` (bytes), `onError`                                                  |
| `csrf`          | `@taserjs/router/middleware/csrf`           | CSRF protection for mutations                      | `origin`                                                                              |
| `etag`          | `@taserjs/router/middleware/etag`           | Generates ETag for cache validation                | `weak: boolean`                                                                       |
| `timing`        | `@taserjs/router/middleware/timing`         | Sets `Server-Timing` headers                       | `total: boolean`, `enabled: boolean`                                                  |
| `compress`      | `@taserjs/router/middleware/compress`       | Gzip/Deflate compression                           | `encoding: "gzip" \| "deflate"`                                                       |

### JWT Example

```ts
// src/routes/api/$.ts
import { t } from "@taserjs/router";
import { jwt } from "@taserjs/router/middleware/jwt";

export default t
  .layout("/api/*")
  .use(jwt<{ sub: string; role: string }>({ secret: process.env.JWT_SECRET! }));

// Downstream handler consumes state.jwtPayload:
// t.get("/api/me").handler(({ state }) => json({ sub: state.jwtPayload.sub }))
```

Generate tokens with `sign`:

```ts
import { sign } from "@taserjs/router/middleware/jwt";

const token = await sign(
  { sub: "user_123", role: "member", exp: Math.floor(Date.now() / 1000) + 3600 },
  process.env.JWT_SECRET!,
  "HS256",
);
```

## Verify

1. Run `npx tsc --noEmit` to confirm typed middleware state propagates to handlers.
2. Send requests to endpoints protected by layout middleware:
   - Without credentials: `curl -i http://localhost:3000/admin/dashboard` (401/403).
   - With credentials: `curl -i http://localhost:3000/admin/dashboard -H "Authorization: Bearer valid-token"` (200).

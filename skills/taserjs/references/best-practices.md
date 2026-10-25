# Architecture & Best Practices

Read when structuring larger APIs, standardizing error envelopes, protecting auth routes, handling pagination, and managing secrets.

## Project Structure for Scalable APIs

In larger applications, keep route handlers thin by separating HTTP translation from core business logic:

```text
my-api/src/
├── context.ts              # createContext singletons (db, logger) and request metadata
├── taser.ts                # defineTaser() app definition, global error handling
├── db/
│   ├── index.ts            # Database client pool
│   └── schema.ts           # Tables, relations, types
├── services/
│   ├── users.service.ts    # Pure business logic and database queries
│   └── auth.service.ts     # Password hashing, token generation
├── middleware/
│   ├── auth.ts             # Authentication & role-based access control
│   └── pagination.ts       # Reusable pagination query parser
└── routes/
    ├── $.ts                # Root layout (cors, cookies, request logging)
    ├── _auth.ts            # Pathless layout for authenticated routes
    ├── _auth.profile.get.ts
    ├── auth.login.post.ts
    └── users/
        ├── index.get.ts
        └── $id.get.ts
```

### Thin Route Handlers

Route handlers should parse parameters, delegate to domain services, and return typed responses:

```ts
// src/routes/users/$id.get.ts
import { t } from "@taserjs/router";
import { json, notFound } from "@taserjs/router/reply";
import { z } from "zod";
import { getUserById } from "../../services/users.service.js";

export default t
  .get("/users/:id")
  .params(z.object({ id: z.coerce.number() }))
  .returns({
    200: z.object({ id: z.number(), email: z.string() }),
    404: z.object({ message: z.string() }),
  })
  .handler(async ({ req, ctx }) => {
    const user = await getUserById(ctx.db, req.params.id);
    if (!user) {
      return notFound({ message: "User not found" });
    }
    return json(user);
  });
```

---

## Standardized Error Envelope

Enforce a uniform JSON error envelope across the entire API:

```ts
// src/taser.ts
import { defineTaser } from "@taserjs/router";
import { badRequest, internalServerError, notFound } from "@taserjs/router/reply";
import { context } from "./context.js";

export default defineTaser()
  .context(context)
  .notFound(({ req }) => {
    return notFound({
      error: {
        code: "NOT_FOUND",
        message: `Endpoint ${req.method} ${req.path} does not exist`,
      },
    });
  })
  .onError((err, req) => {
    if (err instanceof SyntaxError) {
      return badRequest({
        error: {
          code: "INVALID_JSON",
          message: "The request body contains malformed JSON",
        },
      });
    }

    console.error(`[Unhandled Error] ${req.method} ${req.path}:`, err);
    return internalServerError({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected server error occurred",
      },
    });
  });
```

---

## Pathless Auth Layout Pattern

Use pathless layouts to group protected routes without adding an unwanted `/auth` segment to the URL:

```ts
// src/routes/_auth.ts
import { t } from "@taserjs/router";
import { unauthorized } from "@taserjs/router/reply";

export default t.layout("/_auth/*").use(async ({ req }, next) => {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return unauthorized({ message: "Authentication required" });
  }

  // Inject authenticated user into state
  return next({
    user: { id: "user_42", email: "user@example.com" },
  });
});
```

Downstream files inherit protection while maintaining clean URLs:

- `src/routes/_auth.profile.get.ts` -> `GET /profile`
- `src/routes/_auth.orders.get.ts` -> `GET /orders`

---

## Reusable Pagination Middleware

Define reusable query parsers with `middleware().query(...)`:

```ts
// src/middleware/pagination.ts
import { middleware } from "@taserjs/router";
import { z } from "zod";

export const pagination = middleware().query(
  z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
);
```

Attach to any route:

```ts
// src/routes/users.get.ts
import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";
import { pagination } from "../middleware/pagination.js";

export default t
  .get("/users")
  .use(pagination)
  .handler(async ({ req, ctx }) => {
    const { page, limit } = req.query;
    const users = await ctx.db.findMany({ skip: (page - 1) * limit, take: limit });
    return json({ users, page, limit });
  });
```

---

## Secrets & Environment Validation

Validate environment variables during boot context to fail fast on startup if configuration is missing:

```ts
// src/context.ts
import { createContext } from "@taserjs/router";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3000),
});

export const context = createContext({
  boot: () => {
    const env = envSchema.parse(process.env);
    return { env };
  },
});
```

---

## Verify

1. Run `npx tsc --noEmit` to verify type checking across all layered files.
2. Verify that unauthenticated requests to `/_auth.*` routes return 401.
3. Test that malformed JSON payloads return the standardized `INVALID_JSON` error envelope.

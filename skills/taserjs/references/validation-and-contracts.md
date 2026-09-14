# Taser.js Validation & Contracts

This guide covers the phased route builder lifecycle, Standard Schema validation (Zod, Valibot, ArkType), and handler argument facets (`req`, `ctx`, `state`).

---

## 1. Phased Route Builder Lifecycle

```text
1. Middleware Phase        2. Contract / Schema Phase        3. Terminal Handler Phase
   .use(mw1).use(mw2)    ->   .params().query().body()      ->   .handler(async ({ req, ctx, state }) => ...)
                             .returns(...)
```

### Critical Rules

- **Phase Order**: You cannot call `.use(...)` after `.params()`, `.query()`, `.body()`, or `.returns()`.
- **Terminal Step**: Every route builder must terminate with `.handler(...)`.

---

## 2. Standard Schema Validation

```ts
// src/routes/users/$id.put.ts
import { json, notFound } from "@taserjs/router/reply";
import { t } from "@taserjs/router";
import { z } from "zod";

const PUT = t
  .put("/users/:id")
  .params(z.object({ id: z.string().uuid() }))
  .query(z.object({ notify: z.coerce.boolean().default(false) }))
  .body(z.object({ name: z.string().min(2), email: z.string().email() }))
  .returns({
    200: z.object({ id: z.string(), name: z.string(), email: z.string() }),
    404: z.object({ message: z.string() }),
  });

export default PUT.handler(async ({ req, ctx }) => {
  const { id } = req.params;
  const { notify } = req.query;
  const { name, email } = req.body;

  const updated = await ctx.db.updateUser(id, { name, email }, { notify });
  if (!updated) return notFound({ message: "User not found" });

  return json(updated);
});
```

### Contract Methods

- **`.params(schema)`**: Path parameters on `req.params` (string by default if omitted).
- **`.query(schema)`**: Query on `req.query`.
- **`.body(schema)`**: JSON body on `req.body`.
- **`.body("form", schema)`**: `multipart/form-data` on `req.body`.
- **Body Optimization**: When `.body()` is omitted, body reading is skipped.
- **`.returns({ [status]: schema })`** (optional): Documents/validates response payloads. `@taserjs/client` infers success types from reply helpers by default; `.returns({ 200: schema })` overrides the `200` client type.

---

## 3. Handler Argument Anatomy

| Facet / Service | Source              | Description                                                          |
| :-------------- | :------------------ | :------------------------------------------------------------------- |
| `req`           | Request Facet       | `params`, `query`, `body`, `headers`, `method`, `url`, `path`, `raw` |
| `ctx`           | Application Context | Boot/request singletons from `createContext()` (e.g. `ctx.db`)       |
| `state`         | Middleware State    | Cascaded values from ancestor `return next({ ... })`                 |
| `cookies`       | Provided Service    | Cookie Jar Instance — only after mounting `cookie()` on a layout     |

---

## 4. Standalone Validation Middleware

```ts
import { t } from "@taserjs/router";
import { z } from "zod";

export const filterSchema = t.middleware().query(
  z.object({
    search: z.string().optional(),
    sortBy: z.enum(["name", "createdAt"]).default("createdAt"),
    order: z.enum(["asc", "desc"]).default("desc"),
  }),
);
```

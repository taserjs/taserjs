# TaserJS Validation & Contracts

This guide covers the phased route builder lifecycle, Standard Schema validation (Zod, Valibot, ArkType), and the structure of the request context object (`ctx`).

---

## 1. Phased Route Builder Lifecycle

TaserJS enforces a strict compile-time state machine for route files:

```text
1. Middleware Phase        2. Contract / Schema Phase        3. Terminal Handler Phase
   .use(mw1).use(mw2)    ->   .params().query().body()      ->   .handler(async (ctx) => ...)
                             .returns(...)
```

### Critical Rules

- **Phase Order**: You cannot call `.use(...)` after `.params()`, `.query()`, `.body()`, or `.returns()`. The type system strips `.use()` once you enter the contract phase.
- **Terminal Step**: Every route builder must terminate with `.handler(async (ctx) => ...)` to produce the default route export.

---

## 2. Standard Schema Validation

TaserJS supports any validator conforming to the [Standard Schema](https://standardschema.dev/) specification (including Zod, Valibot, ArkType).

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

export default PUT.handler(async (ctx) => {
  const { id } = ctx.params;
  const { notify } = ctx.query;
  const { name, email } = ctx.body;

  const updated = await ctx.db.updateUser(id, { name, email }, { notify });
  if (!updated) return notFound({ message: "User not found" });

  return json(updated);
});
```

### Contract Methods

- **`.params(schema)`**: Validates path parameters. Inferred as `string` by default if omitted.
- **`.query(schema)`**: Validates URL query search parameters.
- **`.body(schema)`**: Parses and validates incoming JSON request bodies.
- **`.body("form", schema)`**: Parses and validates incoming `multipart/form-data` payloads.
- **Body Optimization**: When `.body()` is omitted, request body reading and stream parsing is completely skipped.
- **`.returns({ [status]: schema })`** (optional): Documents and validates server response payloads per status code. `@taserjs/router-client` infers success types from handler reply helpers (`json()`, `ok()`, etc.) by default; defining `.returns({ 200: schema })` overrides that inference for the `200` response.

---

## 3. Context Object (`ctx`) Anatomy

Every route and middleware receives a typed `ctx` object with the following properties:

| Property      | Type / Source                      | Description                                                                               |
| :------------ | :--------------------------------- | :---------------------------------------------------------------------------------------- |
| `ctx.[key]`   | Custom from `createContext`        | Singletons and metadata declared in `boot` and `request` context.                         |
| `ctx.params`  | `Record<string, string>` or Schema | Inferred or validated path parameters (e.g. `ctx.params.id`, `ctx.params._splat`).        |
| `ctx.query`   | Schema Inferred                    | Validated query parameters.                                                               |
| `ctx.body`    | Schema Inferred                    | Validated request body (JSON or parsed form data).                                        |
| `ctx.state`   | `Record<string, any>`              | Downstream state injected by ancestor layouts and middlewares via `return next({ ... })`. |
| `ctx.headers` | `Headers` helper                   | Typed headers interface with convenience getters.                                         |
| `ctx.cookies` | `Cookies` helper                   | Cookie reader and setter interface.                                                       |
| `ctx.request` | `Request`                          | Raw standard Web API `Request` instance (avoid unless necessary).                         |

---

## 4. Standalone Validation Middleware

You can define validation-only middlewares to share reusable query or header requirements across multiple routes:

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

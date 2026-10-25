# Validation, Contracts & Responses

Read when validating params, query, or request body with Standard Schema (Zod, Valibot, ArkType), enforcing `.returns()` contracts, sending typed replies, and handling errors.

## Phased Builder Lifecycle

Taser.js enforces builder phase progression in TypeScript:

```text
Phase 1: Middleware      Phase 2: Contracts & Schemas     Phase 3: Terminal Handler
  .use(mw1).use(mw2)  ->   .params().query().body()    ->   .handler(({ req, ctx }) => ...)
                           .headers().returns()
```

- `.use(...)` cannot be called after `.params()`, `.query()`, `.headers()`, `.body()`, or `.returns()`. The type system strips `.use()` once entering the contract phase.
- Handlers receive facet-split arguments: `{ req, ctx, state, ...services }`.

## Input Validation (Standard Schema)

Taser.js accepts any Standard Schema v1 library (Zod, Valibot, ArkType) in `.params()`, `.query()`, `.headers()`, and `.body()`.

```ts
import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";
import { z } from "zod";

export default t
  .get("/users/:id")
  .params(z.object({ id: z.coerce.number() }))
  .query(z.object({ fields: z.string().optional() }))
  .handler(({ req }) => {
    // req.params.id is number
    // req.query.fields is string | undefined
    return json({ id: req.params.id });
  });
```

### Body Validation & Body Modes

`.body(schema, mode?)` expects the schema as its first argument:

```ts
// JSON payload (default)
t.post("/items").body(z.object({ name: z.string() }));

// Multipart Form payload
t.post("/upload").body(z.object({ file: z.instanceof(File) }), "form");

// URL-encoded Form payload
t.post("/login").body(z.object({ user: z.string() }), "urlencoded");

// Plain Text payload
t.post("/notes").body(z.string(), "text");

// Raw Buffer/Stream payload
t.post("/raw").body(z.instanceof(Uint8Array), "raw");
```

- When `mode` is omitted, Taser autodetects the parser using the request `Content-Type` header (JSON, multipart form, or plain text).
- If the incoming request `Content-Type` contradicts the declared `mode`, Taser returns `415 Unsupported Media Type`.
- If schema validation fails, Taser returns `422 Unprocessable Content` with `{"errors": [StandardSchemaV1.Issue]}`.

## Reply Helpers

Import status and reply helpers from `@taserjs/router/reply`:

```ts
import {
  json,
  ok,
  created,
  accepted,
  noContent,
  text,
  html,
  redirect,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  tooManyRequests,
  internalServerError,
} from "@taserjs/router/reply";
```

### Status & Reply Reference

| Helper                              | HTTP Status          | Headers / Behavior                                        |
| :---------------------------------- | :------------------- | :-------------------------------------------------------- |
| `json(data, init?)`                 | 200 (or init.status) | Serializes data; sets `application/json; charset=utf-8`   |
| `ok(data?, init?)`                  | 200                  | Auto-detects plain objects/arrays for JSON serialization  |
| `created(data?, init?)`             | 201                  | Auto-detects plain objects/arrays for JSON serialization  |
| `accepted(data?, init?)`            | 202                  | Returns empty body by default; passes data if provided    |
| `noContent(init?)`                  | 204                  | Always returns null body                                  |
| `text(str, init?)`                  | 200 (or init.status) | Sets `text/plain; charset=utf-8`                          |
| `html(str, init?)`                  | 200 (or init.status) | Sets `text/html; charset=utf-8`                           |
| `redirect(url, init?)`              | 302 (or init.status) | Sets `Location` header                                    |
| `badRequest(data?, init?)`          | 400                  | Client error helper                                       |
| `unauthorized(data?, init?)`        | 401                  | Authentication required helper                            |
| `forbidden(data?, init?)`           | 403                  | Insufficient permissions helper                           |
| `notFound(data?, init?)`            | 404                  | Resource not found helper                                 |
| `methodNotAllowed(data?, init?)`    | 405                  | HTTP method disallowed helper                             |
| `conflict(data?, init?)`            | 409                  | Resource state conflict helper                            |
| `payloadTooLarge(data?, init?)`     | 413                  | Payload exceeded limit helper                             |
| `unprocessable(data?, init?)`       | 422                  | Validation or semantic error helper                       |
| `tooManyRequests(data?, init?)`     | 429                  | Rate limit helper (e.g. `headers: {"Retry-After": "60"}`) |
| `internalServerError(data?, init?)` | 500                  | Server error helper                                       |

> [!NOTE]
> The helper is named `unprocessable`, not `unprocessableEntity`.

## Return Contracts (`.returns()`)

Declare compile-time and runtime contracts for route responses:

```ts
import { t } from "@taserjs/router";
import { json, notFound } from "@taserjs/router/reply";
import { z } from "zod";

export default t
  .get("/users/:id")
  .params(z.object({ id: z.string() }))
  .returns({
    200: z.object({ id: z.string(), name: z.string() }),
    404: z.object({ message: z.string() }),
  })
  .handler(async ({ req }) => {
    if (req.params.id === "0") {
      return notFound({ message: "User not found" });
    }
    return json({ id: req.params.id, name: "Alice" });
  });
```

- **Compile-time**: TypeScript flags an error if `.handler()` returns a response status or payload shape not declared in `.returns()`.
- **Runtime**: Active when `NODE_ENV !== "production"` and `response.validate !== false`. If the returned body violates the schema, Taser throws `ResponseValidationError`, resulting in `500 {"message": "Response Validation Failed", "status": 200, "issues": [...]}`.

## Error Handling

Taser handles errors deterministically in order:

1. **Thrown Responses**: If a middleware or handler throws `new Response(...)`, Taser returns it directly.
2. **Framework Validation**: `ValidationError` (422), `UnsupportedMediaTypeError` (415), and `ResponseValidationError` (500) bypass `onError` and format structured JSON responses.
3. **Unhandled Runtime Exceptions**: Routed to `defineTaser().onError((err, req) => Response)`:

```ts
// src/taser.ts
import { defineTaser } from "@taserjs/router";
import { internalServerError, badRequest } from "@taserjs/router/reply";

export default defineTaser().onError((err, req) => {
  if (err instanceof SyntaxError) {
    return badRequest({ message: "Malformed JSON body" });
  }
  console.error("Unhandled error:", err);
  return internalServerError({ message: "Internal server error" });
});
```

- Unmatched routes and disallowed methods trigger the `notFound` handler (404), which can also be customized with `defineTaser().notFound(({ req, ctx }) => Response)`.

## Verify

1. Run `npx tsc --noEmit` to verify that `.returns()` catches mismatched return types.
2. Test valid and invalid requests:
   - Valid: `curl -i -X POST http://localhost:3000/items -H "Content-Type: application/json" -d '{"name":"item1"}'` (200/201).
   - Invalid payload: `curl -i -X POST http://localhost:3000/items -H "Content-Type: application/json" -d '{"name":123}'` (422).
   - Wrong media type: `curl -i -X POST http://localhost:3000/items -H "Content-Type: text/plain" -d 'hello'` (415 or 422).

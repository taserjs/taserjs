# Testing Routes In-Process

Read when writing unit, integration, or end-to-end tests for Taser.js endpoints without starting an HTTP server.

## Overview

The compiled `app` exported from `src/.taserjs/routes.gen.ts` is an instance of Hono with full support for `.request(input, init)`. Tests execute in-memory with zero network overhead, no port collisions, and instant execution in Vitest, Jest, or the Node.js test runner.

---

## Direct In-Process Testing (`app.request`)

Import `app` directly from the generated manifest:

```ts
// tests/users.test.ts
import { describe, expect, it } from "vitest";
import { app } from "../src/.taserjs/routes.gen.js";

describe("Users API", () => {
  it("GET / returns welcome message", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ message: "Hello, Taser.js!" });
  });

  it("POST /items validates request body", async () => {
    const res = await app.request("/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Widget" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Widget");
  });

  it("POST /items returns 422 on invalid schema", async () => {
    const res = await app.request("/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }), // empty name violates min(1)
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toHaveProperty("errors");
    expect(body.errors.length).toBeGreaterThan(0);
  });
});
```

---

## Typed RPC Testing with `@taserjs/client`

Test full end-to-end type safety in-process by passing `app.request` to `createClient`:

```ts
// tests/client.test.ts
import { describe, expect, it } from "vitest";
import { createClient } from "@taserjs/client";
import { app, type AppManifest } from "../src/.taserjs/routes.gen.js";

const client = createClient<AppManifest>({
  fetch: (url, init) => app.request(url, init),
});

describe("Typed Client Tests", () => {
  it("fetches user by ID with params", async () => {
    const res = await client.users._id.$get({
      param: { id: "42" },
    });

    expect(res.status).toBe(200);
    const user = await res.json();
    expect(user.id).toBe("42");
  });

  it("uploads files with formBody helper", async () => {
    const file = new File(["sample content"], "test.txt", { type: "text/plain" });

    const res = await client.upload.$post({
      body: new FormData(), // or formBody({ file })
    });

    expect(res.status).toBe(200);
  });
});
```

---

## Testing Cookies & Headers

### Testing Cookie Setting & Signing

```ts
it("POST /auth/session sets a signed cookie", async () => {
  const res = await app.request("/auth/session", { method: "POST" });
  expect(res.status).toBe(200);

  const setCookie = res.headers.get("set-cookie");
  expect(setCookie).toBeDefined();
  expect(setCookie).toContain("session_id=");
});
```

### Passing Cookies to Protected Endpoints

```ts
it("GET /auth/session reads incoming cookie", async () => {
  const res = await app.request("/auth/session", {
    headers: {
      Cookie: "theme=dark",
    },
  });

  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.theme).toBe("dark");
});
```

---

## Mocking Context Singletons

When testing with isolated test databases or mock loggers, configure test context or inject test environment variables before importing `app`:

```ts
// vitest.setup.ts
process.env.DATABASE_URL = "file:./test.db";
process.env.LOG_LEVEL = "silent";
```

Alternatively, test handlers directly by passing mocked `{ req, ctx, state }` facets.

---

## Verify

1. Run tests with Vitest:
   ```bash
   pnpm test
   ```
2. Verify all assertions pass without requiring an open HTTP port.

# TaserJS Client RPC

This guide details how to consume TaserJS backend APIs in frontend or client applications using `@taserjs/router-client`.

---

## 1. Initializing the Client

`@taserjs/router-client` creates a type-safe proxy client derived directly from your server's `RouteManifest` or `typeof app`:

```ts
// src/client.ts
import { createClient } from "@taserjs/router-client";
import type { RouteManifest } from "../.taser/types/routes.d.ts";

export const client = createClient<RouteManifest>({
  baseUrl: "https://api.example.com",
  headers: async () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});
```

---

## 2. Calling API Endpoints

The proxy client exposes methods matching your route verbs (`$get`, `$post`, `$put`, `$patch`, `$delete`, `$options`, `$head`, `$query`):

### Static Endpoints & Query Parameters

```ts
// GET /products?category=electronics&limit=10
const res = await client.products.$get({
  query: { category: "electronics", limit: 10 },
});
const data = await res.json(); // Auto-inferred from handler reply helpers (json(), ok(), etc.)
```

### Dynamic Path Parameters

Path parameters on the server (`:id`) are accessed via `_id` and the `param` argument:

```ts
// GET /users/:id -> GET /users/usr_123
const res = await client.users._id.$get({
  param: { id: "usr_123" },
});
```

### JSON Body Payloads

```ts
// POST /posts
const res = await client.posts.$post({
  body: {
    title: "New Post",
    content: "Post content goes here",
  },
});
```

### Multipart Form Uploads

Use the `formBody` helper to send file uploads:

```ts
import { formBody } from "@taserjs/router-client";

// POST /users/:id/avatar (multipart/form-data)
const res = await client.users._id.avatar.$post({
  param: { id: "usr_123" },
  body: formBody({ avatar: fileInput.files[0] }),
});
```

### Root Endpoints

```ts
// GET /
const res = await client.$get();
```

---

## 3. End-to-End Type Safety

`@taserjs/router-client` infers `await res.json()` types automatically — **`.returns()` is not required**. The client resolves success payload types using this precedence:

1. **Default (no `.returns()`)**: Unions successful `ReplyOf<Status, Body>` types (`200`–`226`) from handler reply helpers (`json()`, `ok()`, `created()`, etc.).
2. **With `.returns({ 200: schema })`**: Uses the `200` schema output type (overrides handler inference).
3. **Fallback**: `unknown` if neither source is available.

```ts
// Server route without .returns() — client still gets full typing:
export default t.get("/users").handler(async () => {
  return json({ users: [{ id: "1", name: "Alice" }] });
});

const res = await client.users.$get();
const data = await res.json();
// data: { users: { id: string; name: string }[] }
```

### Handling Responses

Check `res.ok` or `res.status` at runtime; `json()` is typed for success payloads only (not narrowed per status):

```ts
const res = await client.users._id.$get({ param: { id: "123" } });

if (res.ok) {
  const user = await res.json(); // Typed success payload
  console.log(user.name);
} else {
  console.error("Request failed with status:", res.status);
}
```

Use `InferResponseType` and `InferRequestType` to extract types from client methods:

```ts
import type { InferRequestType, InferResponseType } from "@taserjs/router-client";

type UserInput = InferRequestType<typeof client.users._id.$get>;
type UserData = InferResponseType<typeof client.users._id.$get>;
```

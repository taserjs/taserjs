# TaserJS Client RPC

This guide details how to consume TaserJS backend APIs in frontend or client applications using `@taserjs/router-client`.

---

## 1. Initializing the Client

`@taserjs/router-client` creates a type-safe proxy client derived directly from your server's `RouteManifest`:

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

The proxy client exposes methods matching your route verbs (`$get`, `$post`, `$put`, `$patch`, `$delete`):

### Static Endpoints & Query Parameters

```ts
// GET /products?category=electronics&limit=10
const res = await client.products.$get({
  query: { category: "electronics", limit: 10 },
});
const data = await res.json(); // Fully typed from server .returns[200] schema
```

### Dynamic Path Parameters

Path parameters prefixed with `$` on the server are accessed via `_param` or `param` in the client:

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

When routes define return contracts via `.returns({ 200: schema, 404: errorSchema })`, the response `.json()` return value is automatically typed:

```ts
const res = await client.users._id.$get({ param: { id: "123" } });

if (res.status === 200) {
  const user = await res.json(); // Type: { id: string, name: string, email: string }
  console.log(user.name);
} else if (res.status === 404) {
  const error = await res.json(); // Type: { message: string }
  console.error(error.message);
}
```

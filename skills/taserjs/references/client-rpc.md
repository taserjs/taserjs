# Taser.js Client RPC

This guide details how to consume Taser.js backend APIs using `@taserjs/client`.

---

## 1. Initializing the Client

Pass `AppManifest` from the generated `${serverDir}/.taserjs/routes.gen.ts`:

```ts
// src/client.ts (or src/lib/api.ts)
import { createClient } from "@taserjs/client";
import type { AppManifest } from "./.taserjs/routes.gen.js";
// Next.js / serverDir layouts:
// import type { AppManifest } from "@/server/.taserjs/routes.gen";

export const client = createClient<AppManifest>({
  baseUrl: "https://api.example.com", // optional; defaults to ""
  headers: async () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});
```

Regenerate the manifest (`pnpm dev`, `pnpm build`, or `taser generate`) before relying on new routes in the client.

---

## 2. Calling API Endpoints

Proxy methods: `$get`, `$post`, `$put`, `$patch`, `$delete`, `$options`, `$head`, `$query` (there is no `$fetch`).

### Static Endpoints & Query Parameters

```ts
const res = await client.products.$get({
  query: { category: "electronics", limit: 10 },
});
const data = await res.json();
```

### Dynamic Path Parameters

```ts
const res = await client.users._id.$get({
  param: { id: "usr_123" },
});
```

### JSON Body Payloads

```ts
const res = await client.posts.$post({
  body: {
    title: "New Post",
    content: "Post content goes here",
  },
});
```

### Multipart Form Uploads

```ts
import { formBody } from "@taserjs/client";

const res = await client.users._id.avatar.$post({
  param: { id: "usr_123" },
  body: formBody({ avatar: fileInput.files[0] }),
});
```

### Root Endpoints

```ts
const res = await client.$get();
```

---

## 3. End-to-End Type Safety

`@taserjs/client` infers `await res.json()` types automatically — **`.returns()` is not required**. Precedence:

1. **Default (no `.returns()`)**: Unions successful reply-helper payloads for status codes `200`–`226`.
2. **With `.returns({ 200: schema })`**: Uses the `200` schema output type.
3. **Fallback**: `unknown`.

```ts
const res = await client.users._id.$get({ param: { id: "123" } });

if (res.ok) {
  const user = await res.json();
  console.log(user.name);
} else {
  console.error("Request failed with status:", res.status);
}
```

```ts
import type { InferRequestType, InferResponseType } from "@taserjs/client";

type UserInput = InferRequestType<typeof client.users._id.$get>;
type UserData = InferResponseType<typeof client.users._id.$get>;
```

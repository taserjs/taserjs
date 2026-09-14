# Taser.js Reply & Stream Helpers

This guide details HTTP response reply helpers (`@taserjs/router/reply`) and edge-compatible stream helpers (`@taserjs/router/stream`).

---

## 1. Reply Helpers (`@taserjs/router/reply`)

Prefer returning reply helpers for correct status codes, headers, and content types.

```ts
import {
  json,
  text,
  html,
  noContent,
  redirect,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessableEntity,
  internalServerError,
} from "@taserjs/router/reply";
```

### Success Responses

```ts
return json({ ok: true, data: user });
return json(createdItem, { status: 201, headers: { "X-Item-Id": createdItem.id } });
return text("Health check OK");
return html("<h1>Welcome</h1>");
return noContent();
return redirect("/login");
return redirect("/dashboard", { status: 307 });
```

### Client & Server Error Responses

```ts
return badRequest({ message: "Invalid payload supplied" });
return unauthorized({ message: "Authentication required" });
return forbidden({ message: "Insufficient permissions" });
return notFound({ message: "User not found" });
return conflict({ message: "Email already registered" });
return unprocessableEntity({ errors: [{ field: "email", message: "Invalid format" }] });
return internalServerError({ message: "Database connection failed" });
```

### Reply Namespace Usage

```ts
import { reply } from "@taserjs/router/reply";

return reply.json({ success: true });
return reply.notFound({ message: "Not Found" });
```

---

## 2. Stream Helpers (`@taserjs/router/stream`)

Use Web Standard helpers — `pipe`, `buffer`, `blob`, and `sse`. There is **no** `file()` / `stream.file()` filesystem helper. Serve disk content via your host platform or wrap a `ReadableStream` / `Blob` yourself.

```ts
import { pipe, buffer, blob, sse } from "@taserjs/router/stream";
```

### `pipe` — ReadableStream

```ts
return pipe(customReadableStream, {
  headers: { "Content-Type": "text/plain; charset=utf-8" },
});
```

### `buffer` — Binary bytes

```ts
return buffer(pdfBytes, {
  headers: { "Content-Type": "application/pdf" },
});
```

### `blob` — Blob payloads

```ts
return blob(imageBlob, {
  headers: { "Content-Type": imageBlob.type },
});
```

### `sse` — Server-Sent Events

```ts
import { sse } from "@taserjs/router/stream";

export default t.get("/events").handler(({ req }) => {
  return sse(
    async (stream) => {
      await stream.write({ event: "connected", data: { ok: true } });
      stream.onAbort(() => {
        /* cleanup */
      });
    },
    { signal: req.raw.signal },
  );
});
```

---

## 3. Returning Raw Fetch Responses

When a specialized helper is unavailable:

```ts
return new Response(customArrayBuffer, {
  status: 200,
  headers: { "Content-Type": "application/octet-stream" },
});
```

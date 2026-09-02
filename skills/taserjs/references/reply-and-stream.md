# TaserJS Reply & Stream Helpers

This guide details HTTP response reply helpers (`@taserjs/router/reply`) and streaming helpers (`@taserjs/router/stream`).

---

## 1. Reply Helpers (`@taserjs/router/reply`)

Prefer returning reply helpers to ensure correct status codes, headers, and content types.

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
// 200 OK (application/json)
return json({ ok: true, data: user });

// 201 Created with custom headers/options
return json(createdItem, { status: 201, headers: { "X-Item-Id": createdItem.id } });

// 200 OK (text/plain)
return text("Health check OK");

// 200 OK (text/html)
return html("<h1>Welcome</h1>");

// 204 No Content (empty body)
return noContent();

// 302 Found / 307 Temporary Redirect
return redirect("/login");
return redirect("/dashboard", { status: 307 });
```

### Client & Server Error Responses

```ts
// 400 Bad Request
return badRequest({ message: "Invalid payload supplied" });

// 401 Unauthorized
return unauthorized({ message: "Authentication required" });

// 403 Forbidden
return forbidden({ message: "Insufficient permissions" });

// 404 Not Found
return notFound({ message: "User not found" });

// 409 Conflict
return conflict({ message: "Email already registered" });

// 422 Unprocessable Entity
return unprocessableEntity({ errors: [{ field: "email", message: "Invalid format" }] });

// 500 Internal Server Error
return internalServerError({ message: "Database connection failed" });
```

### Reply Namespace Usage

You can also use the `reply` namespace object:

```ts
import { reply } from "@taserjs/router/reply";

return reply.json({ success: true });
return reply.notFound({ message: "Not Found" });
```

---

## 2. Stream Helpers (`@taserjs/router/stream`)

Stream helpers provide optimized streaming for binary payloads, video/audio files, Server-Sent Events (SSE), and large data pipelines.

```ts
import { stream } from "@taserjs/router/stream";
import { Readable } from "node:stream";

// Stream a file from the filesystem with automatic content-type & range support
return stream.file("path/to/media.mp4");

// Stream from a Node.js Readable or Web ReadableStream
return stream.pipe(Readable.from(dataGenerator()));

// Stream a binary Buffer
return stream.buffer(Buffer.from("Raw binary content"));
```

### Streaming Options

You can supply standard response init parameters (status, headers) to stream helpers:

```ts
return stream.file("reports/export.csv", {
  headers: {
    "Content-Disposition": 'attachment; filename="export.csv"',
    "Content-Type": "text/csv",
  },
});
```

---

## 3. Returning Raw Fetch Responses

When a specialized reply or stream helper is unavailable, you can return a standard Web API `Response`:

```ts
return new Response(customArrayBuffer, {
  status: 200,
  headers: { "Content-Type": "application/octet-stream" },
});
```

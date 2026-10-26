# Streaming & Server-Sent Events (SSE)

Read when streaming responses, serving Server-Sent Events (SSE), or returning binary streams, buffers, or blobs.

## Stream Helpers Overview

Import streaming helpers from `@taserjs/router/stream`:

```ts
import {
  sse,
  pipe,
  buffer,
  blob,
  formatSSE,
  type SSEController,
  type SSEMessage,
} from "@taserjs/router/stream";
```

> [!NOTE]
> Taser.js does not provide a `file()` helper. Return files via `blob(fileBlob)` or `pipe(fileReadableStream)`.

## Server-Sent Events (`sse`)

`sse(callback, init?)` initializes a compliant W3C Server-Sent Events stream:

- Sets headers: `content-type: text/event-stream; charset=utf-8`, `cache-control: no-cache, no-transform`, `connection: keep-alive`, `x-accel-buffering: no`.
- Passes an `SSEController` to the callback.

```ts
// src/routes/events.get.ts
import { t } from "@taserjs/router";
import { sse } from "@taserjs/router/stream";

export default t.get("/events").handler(() => {
  return sse(async (stream) => {
    // Write formatted message objects
    await stream.write({
      event: "connected",
      data: { status: "ready" },
    });

    let count = 0;
    const interval = setInterval(async () => {
      if (stream.aborted) {
        clearInterval(interval);
        return;
      }

      count += 1;
      await stream.write({
        id: String(count),
        event: "tick",
        data: { count, timestamp: Date.now() },
      });

      if (count >= 5) {
        clearInterval(interval);
        stream.close();
      }
    }, 1000);

    // Listen for client disconnect
    stream.onAbort(() => {
      clearInterval(interval);
    });
  });
});
```

### `SSEController` Methods

| Method / Property | Signature                                          | Description                                         |
| :---------------- | :------------------------------------------------- | :-------------------------------------------------- |
| `write(msg)`      | `(message: SSEMessage \| string) => Promise<void>` | Sends an event formatted according to SSE protocol  |
| `close()`         | `() => void`                                       | Closes the stream gracefully                        |
| `onAbort(fn)`     | `(listener: () => void) => () => void`             | Registers an abort callback when client disconnects |
| `aborted`         | `boolean`                                          | Whether the client request has aborted              |

## ReadableStream Piping (`pipe`)

Wrap any standard `ReadableStream` into a web `Response`:

```ts
import { t } from "@taserjs/router";
import { pipe } from "@taserjs/router/stream";

export default t.get("/stream").handler(() => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("chunk 1\n"));
      controller.enqueue(new TextEncoder().encode("chunk 2\n"));
      controller.close();
    },
  });

  return pipe(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
});
```

## Binary Buffers (`buffer`)

Return an `ArrayBuffer` or `Uint8Array` as a binary web response (defaults to `application/octet-stream`):

```ts
import { t } from "@taserjs/router";
import { buffer } from "@taserjs/router/stream";

export default t.get("/download/bin").handler(() => {
  const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
  return buffer(data, {
    headers: { "Content-Type": "image/png" },
  });
});
```

## Blob Responses (`blob`)

Wrap a `Blob` into a web response; automatically infers `Content-Type` from `blob.type`:

```ts
import { t } from "@taserjs/router";
import { blob } from "@taserjs/router/stream";

export default t.get("/download/report").handler(() => {
  const csvBlob = new Blob(["id,name\n1,Alice\n2,Bob"], { type: "text/csv" });
  return blob(csvBlob, {
    headers: { "Content-Disposition": 'attachment; filename="report.csv"' },
  });
});
```

## Formatting Raw SSE Lines (`formatSSE`)

When constructing or buffering raw SSE payload chunks manually:

```ts
import { formatSSE } from "@taserjs/router/stream";

const formatted = formatSSE({
  id: "42",
  event: "update",
  data: { status: "complete" },
  retry: 5000,
});
// Outputs:
// id: 42
// event: update
// retry: 5000
// data: {"status":"complete"}
// \n
```

## Verify

1. Test SSE streaming with curl:
   ```bash
   curl -N http://localhost:3000/events
   ```
2. Verify headers: `content-type: text/event-stream; charset=utf-8` and continuous event delivery.
3. Test binary downloads:
   ```bash
   curl -i http://localhost:3000/download/report
   ```

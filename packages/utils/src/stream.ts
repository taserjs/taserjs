export interface SSEMessage {
  data: string | number | boolean | object | null | undefined;
  event?: string;
  id?: string | number;
  retry?: number;
}

export interface SSEController {
  write(message: SSEMessage | string): Promise<void>;
  close(): void;
  onAbort(listener: () => void): () => void;
  readonly aborted: boolean;
}

export interface SSEInit extends ResponseInit {
  signal?: AbortSignal;
}

/**
 * Formats an SSE message or string into W3C Server-Sent Events text protocol lines.
 */
export function formatSSE(msg: SSEMessage | string): string {
  if (typeof msg === "string") {
    const lines = msg.split(/\r?\n/);
    return lines.map((line) => `data: ${line}`).join("\n") + "\n\n";
  }

  let result = "";
  if (msg.id !== undefined) {
    result += `id: ${msg.id}\n`;
  }
  if (msg.event !== undefined) {
    result += `event: ${msg.event}\n`;
  }
  if (msg.retry !== undefined) {
    result += `retry: ${msg.retry}\n`;
  }

  const rawData =
    msg.data === undefined
      ? ""
      : typeof msg.data === "object"
        ? JSON.stringify(msg.data)
        : String(msg.data);

  const lines = rawData.split(/\r?\n/);
  for (const line of lines) {
    result += `data: ${line}\n`;
  }
  result += "\n";

  return result;
}

/**
 * Wraps a ReadableStream into a streaming Web Response.
 */
export function pipe(stream: ReadableStream, init?: ResponseInit): Response {
  return new Response(stream, init);
}

/**
 * Wraps an ArrayBuffer or Uint8Array into a binary Web Response defaulting to application/octet-stream.
 */
export function buffer(data: ArrayBuffer | Uint8Array, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/octet-stream");
  }

  return new Response(data as BodyInit, {
    ...init,
    status: init?.status ?? 200,
    headers,
  });
}

/**
 * Wraps a Blob instance into a Web Response with proper content-type.
 */
export function blob(data: Blob, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type") && data.type) {
    headers.set("content-type", data.type);
  } else if (!headers.has("content-type")) {
    headers.set("content-type", "application/octet-stream");
  }

  return new Response(data, {
    ...init,
    status: init?.status ?? 200,
    headers,
  });
}

/**
 * Creates a Server-Sent Events (SSE) streaming Web Response.
 */
export function sse(
  callback: (stream: SSEController) => void | Promise<void>,
  init?: SSEInit,
): Response {
  const encoder = new TextEncoder();
  const signal = init?.signal;

  let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
  let isClosed = false;
  let isAborted = Boolean(signal?.aborted);
  const abortListeners = new Set<() => void>();

  const triggerAbort = () => {
    if (isAborted) return;
    isAborted = true;
    isClosed = true;

    if (signal) {
      signal.removeEventListener("abort", onSignalAbort);
    }

    for (const listener of abortListeners) {
      try {
        listener();
      } catch {}
    }
    abortListeners.clear();

    if (streamController) {
      try {
        streamController.close();
      } catch {}
    }
  };

  const onSignalAbort = () => {
    triggerAbort();
  };

  if (signal) {
    if (signal.aborted) {
      isAborted = true;
      isClosed = true;
    } else {
      signal.addEventListener("abort", onSignalAbort, { once: true });
    }
  }

  const sseController: SSEController = {
    get aborted() {
      return isAborted;
    },
    async write(message: SSEMessage | string): Promise<void> {
      if (isClosed || isAborted || !streamController) {
        return;
      }
      const text = formatSSE(message);
      try {
        streamController.enqueue(encoder.encode(text));
      } catch {
        triggerAbort();
      }
    },
    close(): void {
      if (isClosed) return;
      isClosed = true;
      if (signal) {
        signal.removeEventListener("abort", onSignalAbort);
      }
      if (streamController) {
        try {
          streamController.close();
        } catch {}
      }
    },
    onAbort(listener: () => void): () => void {
      if (isAborted) {
        listener();
        return () => {};
      }
      abortListeners.add(listener);
      return () => {
        abortListeners.delete(listener);
      };
    },
  };

  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;

      try {
        const result = callback(sseController);
        if (result && typeof (result as any).then === "function") {
          (result as Promise<void>).then(
            () => {
              if (!isClosed && !isAborted) {
                sseController.close();
              }
            },
            (err) => {
              if (!isClosed && !isAborted) {
                isClosed = true;
                if (signal) {
                  signal.removeEventListener("abort", onSignalAbort);
                }
                try {
                  controller.error(err);
                } catch {}
              }
            },
          );
        }
      } catch (err) {
        if (!isClosed && !isAborted) {
          isClosed = true;
          if (signal) {
            signal.removeEventListener("abort", onSignalAbort);
          }
          try {
            controller.error(err);
          } catch {}
        }
      }
    },
    cancel() {
      triggerAbort();
    },
  });

  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "text/event-stream; charset=utf-8");
  }
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "no-cache, no-transform");
  }
  if (!headers.has("connection")) {
    headers.set("connection", "keep-alive");
  }
  if (!headers.has("x-accel-buffering")) {
    headers.set("x-accel-buffering", "no");
  }

  return new Response(readable, {
    ...init,
    status: init?.status ?? 200,
    headers,
  });
}

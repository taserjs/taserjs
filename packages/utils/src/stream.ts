import { withDefaultHeaders } from "./headers.js";

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

const OCTET_STREAM = "application/octet-stream";

const SSE_HEADERS = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
  "x-accel-buffering": "no",
};

/**
 * Formats an SSE message or string into W3C Server-Sent Events text protocol lines.
 */
export function formatSSE(msg: SSEMessage | string): string {
  const { id, event, retry, data }: SSEMessage = typeof msg === "string" ? { data: msg } : msg;
  const payload =
    data === undefined ? "" : typeof data === "object" ? JSON.stringify(data) : String(data);

  return (
    (id !== undefined ? `id: ${id}\n` : "") +
    (event !== undefined ? `event: ${event}\n` : "") +
    (retry !== undefined ? `retry: ${retry}\n` : "") +
    payload
      .split(/\r?\n/)
      .map((line) => `data: ${line}\n`)
      .join("") +
    "\n"
  );
}

/**
 * Wraps a ReadableStream into a streaming Web Response.
 */
export function pipe(stream: ReadableStream, init?: ResponseInit): Response {
  return new Response(stream, init);
}

function binaryResponse(data: BodyInit, contentType: string, init?: ResponseInit): Response {
  return new Response(data, {
    ...init,
    status: init?.status ?? 200,
    headers: withDefaultHeaders(init?.headers, { "content-type": contentType }),
  });
}

/**
 * Wraps an ArrayBuffer or Uint8Array into a binary Web Response defaulting to application/octet-stream.
 */
export function buffer(data: ArrayBuffer | Uint8Array, init?: ResponseInit): Response {
  return binaryResponse(data as BodyInit, OCTET_STREAM, init);
}

/**
 * Wraps a Blob instance into a Web Response with proper content-type.
 */
export function blob(data: Blob, init?: ResponseInit): Response {
  return binaryResponse(data, data.type || OCTET_STREAM, init);
}

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof (value as PromiseLike<unknown> | undefined)?.then === "function";

/**
 * Creates a Server-Sent Events (SSE) streaming Web Response.
 */
export function sse(
  callback: (stream: SSEController) => void | Promise<void>,
  init?: SSEInit,
): Response {
  const encoder = new TextEncoder();
  const signal = init?.signal;
  const abortListeners = new Set<() => void>();

  // Closed means no more writes; aborted additionally means the consumer is gone.
  let aborted = Boolean(signal?.aborted);
  let closed = aborted;
  let controller!: ReadableStreamDefaultController<Uint8Array>;

  const abort = () => {
    if (aborted) return;
    aborted = true;
    closed = true;
    signal?.removeEventListener("abort", abort);

    for (const listener of abortListeners) {
      try {
        listener();
      } catch {}
    }
    abortListeners.clear();

    try {
      controller.close();
    } catch {}
  };

  // Settles the stream once, either cleanly or with the callback's failure.
  const end = (settle: () => void) => {
    if (closed) return;
    closed = true;
    signal?.removeEventListener("abort", abort);
    try {
      settle();
    } catch {}
  };

  const stream: SSEController = {
    get aborted() {
      return aborted;
    },
    async write(message) {
      if (closed) return;
      try {
        controller.enqueue(encoder.encode(formatSSE(message)));
      } catch {
        abort();
      }
    },
    close: () => end(() => controller.close()),
    onAbort(listener) {
      if (aborted) {
        listener();
        return () => {};
      }
      abortListeners.add(listener);
      return () => {
        abortListeners.delete(listener);
      };
    },
  };

  if (signal && !signal.aborted) {
    signal.addEventListener("abort", abort, { once: true });
  }

  const readable = new ReadableStream<Uint8Array>({
    start(streamController) {
      controller = streamController;
      // No abort event will fire for a signal that was aborted before construction.
      if (aborted) streamController.close();

      try {
        const result = callback(stream);
        if (isThenable(result)) {
          result.then(stream.close, (error) => end(() => controller.error(error)));
        }
      } catch (error) {
        end(() => controller.error(error));
      }
    },
    cancel: abort,
  });

  return new Response(readable, {
    ...init,
    status: init?.status ?? 200,
    headers: withDefaultHeaders(init?.headers, SSE_HEADERS),
  });
}

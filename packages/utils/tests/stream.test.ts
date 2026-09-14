// oxlint-disable no-await-in-loop
import { describe, expect, it } from "vitest";
import { blob, buffer, formatSSE, pipe, sse, type SSEMessage } from "../src/stream.js";

async function readStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode();
  return result;
}

describe("@taserjs/utils/stream", () => {
  describe("pipe", () => {
    it("wraps a ReadableStream into a streaming Response with custom init", async () => {
      const encoder = new TextEncoder();
      const customStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode("chunk 1, "));
          controller.enqueue(encoder.encode("chunk 2"));
          controller.close();
        },
      });

      const res = pipe(customStream, {
        status: 206,
        headers: { "x-stream-type": "llm-tokens" },
      });

      expect(res.status).toBe(206);
      expect(res.headers.get("x-stream-type")).toBe("llm-tokens");
      expect(await res.text()).toBe("chunk 1, chunk 2");
    });
  });

  describe("buffer", () => {
    it("returns a binary response for Uint8Array with application/octet-stream default", async () => {
      const bytes = new Uint8Array([1, 2, 3, 4, 5]);
      const res = buffer(bytes);

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/octet-stream");
      const result = new Uint8Array(await res.arrayBuffer());
      expect(Array.from(result)).toEqual([1, 2, 3, 4, 5]);
    });

    it("returns a binary response for ArrayBuffer with custom headers", async () => {
      const ab = new ArrayBuffer(4);
      const view = new DataView(ab);
      view.setInt32(0, 42);

      const res = buffer(ab, {
        status: 201,
        headers: { "content-type": "application/custom-binary" },
      });

      expect(res.status).toBe(201);
      expect(res.headers.get("content-type")).toBe("application/custom-binary");
      const resultView = new DataView(await res.arrayBuffer());
      expect(resultView.getInt32(0)).toBe(42);
    });
  });

  describe("blob", () => {
    it("preserves Blob type when provided", async () => {
      const fileBlob = new Blob(["image data"], { type: "image/png" });
      const res = blob(fileBlob);

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/png");
      expect(await res.text()).toBe("image data");
    });

    it("defaults to application/octet-stream when Blob has no type", async () => {
      const fileBlob = new Blob(["raw data"]);
      const res = blob(fileBlob);

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/octet-stream");
    });
  });

  describe("formatSSE", () => {
    it("formats simple string data with data: prefix and double newline", () => {
      expect(formatSSE("hello world")).toBe("data: hello world\n\n");
    });

    it("formats multi-line string data with data: on each line", () => {
      expect(formatSSE("line 1\nline 2\r\nline 3")).toBe(
        "data: line 1\ndata: line 2\ndata: line 3\n\n",
      );
    });

    it("formats full SSE message with id, event, retry, and JSON data", () => {
      const msg: SSEMessage = {
        id: "msg-1",
        event: "delta",
        retry: 2500,
        data: { token: "Taser" },
      };
      const formatted = formatSSE(msg);
      expect(formatted).toBe('id: msg-1\nevent: delta\nretry: 2500\ndata: {"token":"Taser"}\n\n');
    });

    it("handles primitives and null in SSE data", () => {
      expect(formatSSE({ data: 42 })).toBe("data: 42\n\n");
      expect(formatSSE({ data: true })).toBe("data: true\n\n");
      expect(formatSSE({ data: null })).toBe("data: null\n\n");
    });
  });

  describe("sse", () => {
    it("sets standard SSE headers", () => {
      const res = sse((stream) => {
        stream.close();
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("text/event-stream; charset=utf-8");
      expect(res.headers.get("cache-control")).toBe("no-cache, no-transform");
      expect(res.headers.get("connection")).toBe("keep-alive");
      expect(res.headers.get("x-accel-buffering")).toBe("no");
    });

    it("streams events and auto-closes when callback finishes", async () => {
      const res = sse(async (stream) => {
        await stream.write({ event: "greeting", data: "hello" });
        await stream.write({ event: "update", data: { count: 1 } });
      });

      expect(res.body).not.toBeNull();
      const output = await readStream(res.body!);
      expect(output).toBe('event: greeting\ndata: hello\n\nevent: update\ndata: {"count":1}\n\n');
    });

    it("supports explicit stream.close()", async () => {
      const res = sse(async (stream) => {
        await stream.write("first");
        stream.close();
        await stream.write("should not be sent");
      });

      const output = await readStream(res.body!);
      expect(output).toBe("data: first\n\n");
    });

    it("handles abort via signal and triggers onAbort listeners", async () => {
      const controller = new AbortController();
      let abortTriggered = false;

      const res = sse(
        (stream) => {
          stream.onAbort(() => {
            abortTriggered = true;
          });
        },
        { signal: controller.signal },
      );

      controller.abort();
      expect(abortTriggered).toBe(true);

      const output = await readStream(res.body!);
      expect(output).toBe("");
    });

    it("supports unsubscribe on onAbort and immediately invokes listener if already aborted", async () => {
      const controller = new AbortController();
      let streamRef: any = null;
      let lateAbortCalled = false;
      let unsubCalled = false;

      sse(
        (stream) => {
          streamRef = stream;
          const unsub = stream.onAbort(() => {
            unsubCalled = true;
          });
          unsub();
        },
        { signal: controller.signal },
      );

      controller.abort();
      expect(unsubCalled).toBe(false);
      expect(streamRef.aborted).toBe(true);

      streamRef.onAbort(() => {
        lateAbortCalled = true;
      });
      expect(lateAbortCalled).toBe(true);

      // Writes after abort are safe no-ops
      await streamRef.write("should not crash or write");
    });

    it("handles abort via stream reader cancel", async () => {
      let abortTriggered = false;
      let streamRef: any = null;

      const res = sse(async (stream) => {
        streamRef = stream;
        stream.onAbort(() => {
          abortTriggered = true;
        });
        await stream.write("start");
      });

      const reader = res.body!.getReader();
      const firstChunk = await reader.read();
      expect(new TextDecoder().decode(firstChunk.value)).toBe("data: start\n\n");

      await reader.cancel();
      expect(abortTriggered).toBe(true);
      expect(streamRef.aborted).toBe(true);
    });

    it("propagates error when callback rejects", async () => {
      const res = sse(async () => {
        throw new Error("Stream exploded");
      });

      await expect(readStream(res.body!)).rejects.toThrow("Stream exploded");
    });

    it("delivers incremental chunks sequentially before closing", async () => {
      const res = sse(async (stream) => {
        await stream.write({ data: "chunk-1" });
        await stream.write({ data: "chunk-2" });
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      const chunk1 = await reader.read();
      expect(chunk1.done).toBe(false);
      expect(decoder.decode(chunk1.value)).toBe("data: chunk-1\n\n");

      const chunk2 = await reader.read();
      expect(chunk2.done).toBe(false);
      expect(decoder.decode(chunk2.value)).toBe("data: chunk-2\n\n");

      const finalChunk = await reader.read();
      expect(finalChunk.done).toBe(true);
    });
  });
});

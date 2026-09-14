// oxlint-disable no-await-in-loop
import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { blob, buffer, formatSSE, pipe, sse } from "../src/stream.js";

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

describe("@taserjs/router/stream", () => {
  it("re-exports all stream helpers from @taserjs/utils/stream", () => {
    expect(typeof pipe).toBe("function");
    expect(typeof buffer).toBe("function");
    expect(typeof blob).toBe("function");
    expect(typeof sse).toBe("function");
    expect(typeof formatSSE).toBe("function");
  });

  it("serves SSE streaming endpoint over HTTP request", async () => {
    const app = new Hono();

    app.get("/events", () => {
      return sse(async (stream) => {
        await stream.write({ event: "connected", data: { client: "web" } });
        await stream.write({ event: "message", data: "live update" });
      });
    });

    const res = await app.request("/events");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(res.headers.get("cache-control")).toContain("no-cache");

    const text = await readStream(res.body!);
    expect(text).toContain('event: connected\ndata: {"client":"web"}\n\n');
    expect(text).toContain("event: message\ndata: live update\n\n");
  });

  it("serves binary buffer endpoint over HTTP request", async () => {
    const app = new Hono();

    app.get("/binary", () => {
      const data = new Uint8Array([10, 20, 30, 40]);
      return buffer(data);
    });

    const res = await app.request("/binary");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/octet-stream");

    const received = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(received)).toEqual([10, 20, 30, 40]);
  });

  it("serves piped stream endpoint over HTTP request", async () => {
    const app = new Hono();
    const encoder = new TextEncoder();

    app.get("/stream", () => {
      const readable = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode("hello "));
          controller.enqueue(encoder.encode("streaming world"));
          controller.close();
        },
      });

      return pipe(readable, {
        headers: { "x-custom-stream": "active" },
      });
    });

    const res = await app.request("/stream");
    expect(res.status).toBe(200);
    expect(res.headers.get("x-custom-stream")).toBe("active");
    expect(await res.text()).toBe("hello streaming world");
  });

  it("serves blob endpoint over HTTP request", async () => {
    const app = new Hono();

    app.get("/blob", () => {
      const b = new Blob([JSON.stringify({ from: "blob" })], {
        type: "application/json",
      });
      return blob(b);
    });

    const res = await app.request("/blob");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(await res.json()).toEqual({ from: "blob" });
  });
});

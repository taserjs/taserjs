import { describe, expect, it, vi } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { ViteDevServer } from "vite";

import { createViteDevMiddleware, invalidateDevServerCache } from "../src/core/dev-server.js";

function createMockServer(loadModuleImpl: () => Promise<any>): ViteDevServer {
  return {
    ssrLoadModule: vi.fn().mockImplementation(loadModuleImpl),
    ssrFixStacktrace: vi.fn(),
  } as unknown as ViteDevServer;
}

describe("createViteDevMiddleware", () => {
  it("skips internal vite requests directly to next()", async () => {
    const server = createMockServer(async () => ({}));
    const middleware = createViteDevMiddleware(server, "/root");

    const urls = [
      "/@vite/client",
      "/__vite_ping",
      "/__open-in-editor",
      "/src/main.ts?import",
      "/src/style.css?raw",
      "/node_modules/vite/dist/client.js",
    ];

    await Promise.all(
      urls.map(async (url) => {
        const next = vi.fn();
        await middleware({ url, headers: {} } as IncomingMessage, {} as ServerResponse, next);
        expect(next).toHaveBeenCalledTimes(1);
        expect(server.ssrLoadModule).not.toHaveBeenCalled();
      }),
    );
  });

  it("skips non-basePath requests when basePath is configured", async () => {
    const server = createMockServer(async () => ({}));
    const middleware = createViteDevMiddleware(server, "/root", {
      basePath: "/api",
    });

    const next = vi.fn();
    await middleware(
      { url: "/assets/logo.png", headers: {} } as IncomingMessage,
      {} as ServerResponse,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(server.ssrLoadModule).not.toHaveBeenCalled();
  });

  it("caches the SSR module and reuses it across requests", async () => {
    invalidateDevServerCache();

    let handledCount = 0;
    const fakeApp = {
      fetch: vi.fn().mockImplementation(async () => {
        handledCount++;
        return new Response("ok");
      }),
    };

    const server = createMockServer(async () => ({ taserApp: fakeApp }));
    const middleware = createViteDevMiddleware(server, "/root");

    const req1 = {
      url: "/hello",
      method: "GET",
      headers: { host: "localhost" },
    } as unknown as IncomingMessage;
    const res1 = {
      statusCode: 200,
      setHeader: vi.fn(),
      end: vi.fn(),
      writeHead: vi.fn(),
    } as unknown as ServerResponse;

    await middleware(req1, res1, vi.fn());
    expect(server.ssrLoadModule).toHaveBeenCalledTimes(1);

    const req2 = {
      url: "/hello2",
      method: "GET",
      headers: { host: "localhost" },
    } as unknown as IncomingMessage;
    const res2 = {
      statusCode: 200,
      setHeader: vi.fn(),
      end: vi.fn(),
      writeHead: vi.fn(),
    } as unknown as ServerResponse;

    await middleware(req2, res2, vi.fn());
    // Should NOT call ssrLoadModule again because it is cached
    expect(server.ssrLoadModule).toHaveBeenCalledTimes(1);

    // After invalidation, it should reload on the next request
    invalidateDevServerCache();
    await middleware(req2, res2, vi.fn());
    expect(server.ssrLoadModule).toHaveBeenCalledTimes(2);
    expect(handledCount).toBe(3);
  });
});

import { reply } from "@taserjs/router-utils";
import type { Context, Next } from "hono";
import { describe, expect, it } from "vitest";

import { createTaserCompatHandler } from "../src/http/hono-compat.js";
import { composePipeline, middlewareToLayer } from "../src/index.js";
import type { PipelineContext } from "../src/types.js";

function compatLayer(middleware: Parameters<typeof createTaserCompatHandler>[0]) {
  return middlewareToLayer({ handler: createTaserCompatHandler(middleware) });
}

// Mock Hono Context for testing
function createMockHonoContext(overrides: Partial<Context> = {}): Context {
  const vars: Record<string, unknown> = {};
  const responseHeaders = new Headers();

  return {
    req: {
      url: "http://localhost/test",
      method: "GET",
      header: () => null,
      param: () => ({}),
      raw: new Request("http://localhost/test"),
    },
    res: {
      headers: responseHeaders,
      status: 200,
    },
    var: vars,
    set: (key: string, value: unknown) => {
      vars[key] = value;
    },
    get: (key: string) => vars[key],
    header: (key: string, value?: string) => {
      if (value !== undefined) {
        responseHeaders.set(key, value);
      }
      return responseHeaders.get(key);
    },
    env: {},
    executionCtx: undefined as any,
    finalized: false,
    ...overrides,
  } as Context;
}

describe("createTaserCompatHandler", () => {
  it("creates a compat Hono context when no outer Hono context is available", async () => {
    const ctx: PipelineContext = {
      state: {},
      request: new Request("http://localhost/test"),
      headers: { get: () => undefined, entries: () => [] } as any,
      cookies: {} as any,
      params: {},
      query: {},
      method: "GET",
      path: "/test",
    };

    let executed = false;
    const layers = [
      compatLayer(async (c, next) => {
        expect(c).toBeDefined();
        expect(c.req.path).toBe("/test");
        c.header("X-Compat", "1");
        executed = true;
        return next();
      }),
    ];
    const run = composePipeline(layers, async () => reply.json({ ok: true }));
    const result = (await run(ctx)) as Response;
    expect(executed).toBe(true);
    expect(result.headers.get("X-Compat")).toBe("1");
  });

  it("works with ctx.hono", async () => {
    const honoCtx = createMockHonoContext();
    const order: string[] = [];

    const layers = [
      compatLayer(async (c, next) => {
        order.push("hono-middleware");
        expect(c).toBe(honoCtx);
        const result = await next();
        order.push("hono-after-next");
        return result;
      }),
    ];

    const ctx: PipelineContext = {
      state: {},
      hono: honoCtx,
    };

    const run = composePipeline(layers, async () => {
      order.push("handler");
      return reply.json({ ok: true });
    });

    const result = await run(ctx);
    expect(result).toBeInstanceOf(Response);
    expect(order).toEqual(["hono-middleware", "handler", "hono-after-next"]);
  });

  it("works with ctx.native as Hono context fallback", async () => {
    const honoCtx = createMockHonoContext();

    const layers = [
      compatLayer(async (c, next) => {
        expect(c).toBe(honoCtx);
        return next();
      }),
    ];

    const ctx: PipelineContext = {
      state: {},
      native: honoCtx,
    };

    const run = composePipeline(layers, async () => reply.json({ ok: true }));

    const result = await run(ctx);
    expect(result).toBeInstanceOf(Response);
  });

  it("supports short-circuit with Response", async () => {
    const honoCtx = createMockHonoContext();
    const ctx: PipelineContext = {
      state: {},
      hono: honoCtx,
    };

    const layers = [compatLayer(async () => new Response("Short circuit", { status: 404 }))];
    const run = composePipeline(layers, async () => {
      throw new Error("Handler should not be called");
    });

    const result = await run(ctx);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(404);
    expect(await (result as Response).text()).toBe("Short circuit");
  });

  it("syncs Hono vars into ctx.var without polluting root context", async () => {
    const honoCtx = createMockHonoContext();

    const layers = [
      compatLayer(async (c, next) => {
        c.set("testVar", "testValue");
        c.set("anotherVar", 42);
        return next();
      }),
    ];

    const ctx: PipelineContext = {
      state: {},
      hono: honoCtx,
      var: {},
    };

    const run = composePipeline(layers, async (pipelineCtx) => {
      expect(pipelineCtx.var).toEqual({
        testVar: "testValue",
        anotherVar: 42,
      });
      expect(pipelineCtx).not.toHaveProperty("testVar");
      expect(pipelineCtx).not.toHaveProperty("anotherVar");
      return reply.json({ ok: true });
    });

    await run(ctx);
  });

  it("syncs Hono headers to response", async () => {
    const honoCtx = createMockHonoContext();

    const layers = [
      compatLayer(async (c, next) => {
        c.header("X-Custom-Header", "custom-value");
        c.header("X-Another-Header", "another-value");
        return next();
      }),
    ];

    const ctx: PipelineContext = {
      state: {},
      hono: honoCtx,
    };

    const run = composePipeline(layers, async () => reply.json({ ok: true }));

    const result = (await run(ctx)) as Response;
    expect(result.headers.get("X-Custom-Header")).toBe("custom-value");
    expect(result.headers.get("X-Another-Header")).toBe("another-value");
  });

  it("chains multiple Taser-wrapped middlewares in sequence", async () => {
    const order: string[] = [];
    const honoCtx = createMockHonoContext();

    const layers = [
      compatLayer(async (_c: Context, next: Next) => {
        order.push("mw1-before");
        const result = await next();
        order.push("mw1-after");
        return result;
      }),
      compatLayer(async (_c: Context, next: Next) => {
        order.push("mw2-before");
        const result = await next();
        order.push("mw2-after");
        return result;
      }),
    ];

    const ctx: PipelineContext = {
      state: {},
      hono: honoCtx,
    };

    const run = composePipeline(layers, async () => {
      order.push("handler");
      return reply.json({ ok: true });
    });

    await run(ctx);
    expect(order).toEqual(["mw1-before", "mw2-before", "handler", "mw2-after", "mw1-after"]);
  });

  it("handles fall-through when middleware does not call next", async () => {
    const honoCtx = createMockHonoContext();
    const ctx: PipelineContext = {
      state: {},
      hono: honoCtx,
    };

    const layers = [compatLayer(async () => undefined)];
    const run = composePipeline(layers, async () => reply.json({ fallThrough: true }));

    const result = (await run(ctx)) as Response;
    const json = await result.json();
    expect(json).toEqual({ fallThrough: true });
  });
});

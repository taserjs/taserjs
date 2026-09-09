import { describe, it, expect } from "vitest";
import { Context } from "hono";
import { cors } from "hono/cors";
import { t } from "../src/index.js";
import type { TaserRequest } from "../src/index.js";

function createDummyRequest(url = "http://localhost/test", method = "GET"): TaserRequest {
  const raw = new Request(url, { method });
  return {
    params: {},
    query: {},
    headers: raw.headers as any,
    method,
    url: raw.url,
    path: new URL(url).pathname,
    raw,
  };
}

describe("t.hono adapter", () => {
  it("creates a MiddlewareDefinition with kind 'middleware'", () => {
    const mw = t.hono(async (_c, next) => {
      await next();
    });

    expect(mw.kind).toBe("middleware");
    expect(typeof mw.handler).toBe("function");
  });

  it("mounts into layout and route chains fluently", () => {
    const honoMw = t.hono(async (_c, next) => {
      await next();
    });

    const layout = t.layout("/api").use(honoMw);
    expect(layout.middlewares).toHaveLength(1);
    expect(layout.middlewares[0]!.kind).toBe("middleware");

    const route = t
      .get("/api/test")
      .use(honoMw)
      .handler(async () => new Response("ok"));
    expect(route.middlewares).toHaveLength(1);
  });

  it("delegates to next() and preserves downstream response", async () => {
    let order: string[] = [];

    const mw = t.hono(async (c, next) => {
      order.push("hono:enter");
      c.header("X-Hono-Before", "1");
      await next();
      c.header("X-Hono-After", "2");
      order.push("hono:exit");
    });

    const c = new Context(new Request("http://localhost/test"));
    const req = createDummyRequest();
    const ctx = { context: c };

    const nextFn = Object.assign(
      async () => {
        order.push("downstream");
        return new Response("downstream-body", { status: 200, headers: { "X-Downstream": "yes" } });
      },
      { provide: async () => new Response("ok") },
    );

    const res = await mw.handler({ req, ctx, state: {} }, nextFn as any);

    expect(order).toEqual(["hono:enter", "downstream", "hono:exit"]);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("downstream-body");
    expect(res.headers.get("X-Downstream")).toBe("yes");
    expect(res.headers.get("X-Hono-Before")).toBe("1");
    expect(res.headers.get("X-Hono-After")).toBe("2");
  });

  it("short-circuits when Hono middleware returns an early Response", async () => {
    let downstreamCalled = false;

    const mw = t.hono(async (c) => {
      return c.json({ error: "blocked" }, 403);
    });

    const c = new Context(new Request("http://localhost/test"));
    const req = createDummyRequest();
    const ctx = { context: c };

    const nextFn = Object.assign(
      async () => {
        downstreamCalled = true;
        return new Response("ok");
      },
      { provide: async () => new Response("ok") },
    );

    const res = await mw.handler({ req, ctx, state: {} }, nextFn as any);

    expect(downstreamCalled).toBe(false);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "blocked" });
  });

  it("bubbles downstream errors through Hono middleware", async () => {
    let caughtInHono = false;

    const mw = t.hono(async (_c, next) => {
      try {
        await next();
      } catch (err) {
        caughtInHono = true;
        throw err;
      }
    });

    const c = new Context(new Request("http://localhost/test"));
    const req = createDummyRequest();
    const ctx = { context: c };

    const nextFn = Object.assign(
      async () => {
        throw new Error("downstream explosion");
      },
      { provide: async () => new Response("ok") },
    );

    await expect(mw.handler({ req, ctx, state: {} }, nextFn as any)).rejects.toThrow(
      "downstream explosion",
    );
    expect(caughtInHono).toBe(true);
  });

  it("integrates seamlessly with native hono/cors middleware", async () => {
    const corsMw = t.hono(cors({ origin: "https://example.com" }));

    // Preflight OPTIONS request
    const preflightRaw = new Request("http://localhost/test", {
      method: "OPTIONS",
      headers: {
        Origin: "https://example.com",
        "Access-Control-Request-Method": "GET",
      },
    });
    const preflightC = new Context(preflightRaw);
    const preflightReq = createDummyRequest("http://localhost/test", "OPTIONS");
    const preflightCtx = { context: preflightC };

    let preflightDownstreamCalled = false;
    const preflightNext = Object.assign(
      async () => {
        preflightDownstreamCalled = true;
        return new Response("ok");
      },
      { provide: async () => new Response("ok") },
    );

    const preflightRes = await corsMw.handler(
      { req: preflightReq, ctx: preflightCtx, state: {} },
      preflightNext as any,
    );

    expect(preflightDownstreamCalled).toBe(false);
    expect(preflightRes.status).toBe(204);
    expect(preflightRes.headers.get("Access-Control-Allow-Origin")).toBe("https://example.com");

    // Standard GET request
    const getRaw = new Request("http://localhost/test", {
      method: "GET",
      headers: { Origin: "https://example.com" },
    });
    const getC = new Context(getRaw);
    const getReq = createDummyRequest("http://localhost/test", "GET");
    const getCtx = { context: getC };

    const getNext = Object.assign(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      { provide: async () => new Response("ok") },
    );

    const getRes = await corsMw.handler({ req: getReq, ctx: getCtx, state: {} }, getNext as any);

    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("Access-Control-Allow-Origin")).toBe("https://example.com");
    expect(getRes.headers.get("Vary")).toContain("Origin");
    expect(await getRes.json()).toEqual({ ok: true });
  });
});

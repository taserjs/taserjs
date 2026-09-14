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
    body: undefined,
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

  describe("t.hono(mw, refine?)", () => {
    it("works without refine callback by default", async () => {
      const mw = t.hono(async (_c, next) => {
        await next();
      });

      const c = new Context(new Request("http://localhost/test"));
      const req = createDummyRequest();
      const ctx = { context: c };

      let downstreamCalled = false;
      const nextFn = Object.assign(
        async () => {
          downstreamCalled = true;
          return new Response("bare-hono-ok");
        },
        { provide: async () => new Response("ok") },
      );

      const res = await mw.handler({ req, ctx, state: {} }, nextFn as any);
      expect(downstreamCalled).toBe(true);
      expect(await res.text()).toBe("bare-hono-ok");
    });

    it("injects state via refine callback: (c, next) => next(state)", async () => {
      const authHonoMw = t.hono(
        async (c, next) => {
          c.set("jwtUser", { id: "user_123", role: "admin" });
          await next();
        },
        (c, next) => {
          const user = c.get("jwtUser");
          return next({ user });
        },
      );

      const c = new Context(new Request("http://localhost/test"));
      const req = createDummyRequest();
      const ctx = { context: c };

      let receivedState: any = null;
      const nextFn = Object.assign(
        async (state?: any) => {
          receivedState = state;
          return new Response("refined-ok");
        },
        {
          provide: async (_services: any, state?: any) => {
            receivedState = state;
            return new Response("refined-ok");
          },
        },
      );

      const res = await authHonoMw.handler({ req, ctx, state: {} }, nextFn as any);
      expect(receivedState).toEqual({ user: { id: "user_123", role: "admin" } });
      expect(await res.text()).toBe("refined-ok");
    });

    it("injects services via refine callback: (c, next) => next.provide(services, state)", async () => {
      const serviceHonoMw = t.hono(
        async (c, next) => {
          c.set("tenantId", "tenant_xyz");
          await next();
        },
        (c, next) => {
          const tenantId = c.get("tenantId");
          const tenantService = { getTenant: () => tenantId };
          return next.provide({ tenantService }, { tenantId });
        },
      );

      const c = new Context(new Request("http://localhost/test"));
      const req = createDummyRequest();
      const ctx = { context: c };

      let receivedServices: any = null;
      let receivedState: any = null;
      const nextFn = Object.assign(
        async (state?: any) => {
          receivedState = state;
          return new Response("ok");
        },
        {
          provide: async (services: any, state?: any) => {
            receivedServices = services;
            receivedState = state;
            return new Response("services-provided-ok");
          },
        },
      );

      const res = await serviceHonoMw.handler({ req, ctx, state: {} }, nextFn as any);
      expect(receivedServices).toBeDefined();
      expect(receivedServices.tenantService.getTenant()).toBe("tenant_xyz");
      expect(receivedState).toEqual({ tenantId: "tenant_xyz" });
      expect(await res.text()).toBe("services-provided-ok");
    });

    it("preserves bi-directional post-next modifications in hono middleware", async () => {
      const timingMw = t.hono(
        async (c, next) => {
          c.set("injected", "yes");
          await next();
          c.res.headers.set("X-Post-Processed", "true");
        },
        (c, next) => {
          return next({ injected: c.get("injected") });
        },
      );

      const c = new Context(new Request("http://localhost/test"));
      const req = createDummyRequest();
      const ctx = { context: c };

      let seenState: any = null;
      const nextFn = Object.assign(
        async (state?: any) => {
          seenState = state;
          return new Response("timing-body", {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        },
        { provide: async () => new Response("ok") },
      );

      const res = await timingMw.handler({ req, ctx, state: {} }, nextFn as any);
      expect(seenState).toEqual({ injected: "yes" });
      expect(res.headers.get("X-Post-Processed")).toBe("true");
      expect(await res.text()).toBe("timing-body");
    });

    it("short-circuits and does not invoke refine callback if Hono middleware returns early", async () => {
      let refineCalled = false;
      const blockedMw = t.hono(
        async (c) => {
          return c.json({ error: "unauthorized" }, 401);
        },
        (_c, next) => {
          refineCalled = true;
          return next({ fail: true });
        },
      );

      const c = new Context(new Request("http://localhost/test"));
      const req = createDummyRequest();
      const ctx = { context: c };

      const nextFn = Object.assign(async () => new Response("ok"), {
        provide: async () => new Response("ok"),
      });

      const res = await blockedMw.handler({ req, ctx, state: {} }, nextFn as any);
      expect(refineCalled).toBe(false);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "unauthorized" });
    });

    it("statically typechecks services and state propagated by refine callback to RouteBuilder", () => {
      const authMw = t.hono(
        async (c, next) => {
          c.set("jwtUser", { id: "u1", name: "Alice" });
          await next();
        },
        (c, next) => {
          const user = c.get("jwtUser") as { id: string; name: string };
          const helper = { greet: () => `Hello ${user.name}` };
          return next.provide({ helper }, { user });
        },
      );

      // RouteBuilder.use(authMw) should typecheck handler accessing helper and state.user
      const route = t
        .get("/test-typecheck")
        .use(authMw)
        .handler(({ state, helper }) => {
          const userName: string = state.user.name;
          const greeting: string = helper.greet();
          return new Response(`${userName}: ${greeting}`);
        });

      expect(route).toBeDefined();
    });
  });
});

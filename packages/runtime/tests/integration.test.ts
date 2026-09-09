import { describe, it, expect } from "vitest";
import { createContext, defineTaser, t } from "@taserjs/router";
import { json } from "@taserjs/utils";
import { createTaserApp } from "../src/index.js";

describe("Composed Onion Pipeline Integration", () => {
  it("executes root layout, directory layout, pathless layout, route middlewares, and route handler in onion order with state inheritance", async () => {
    const trace: string[] = [];

    // Root layout ($.ts)
    const rootLayout = t.layout("/*").use(async (_args, next) => {
      trace.push("root:enter");
      const res = await next({ root: true });
      res.headers.set("X-Layout-Root", "applied");
      trace.push("root:exit");
      return res;
    });

    // Directory layout (admin/$.ts)
    const adminLayout = t.layout("/admin/*").use(async ({ state }, next) => {
      trace.push("admin:enter");
      const res = await next({ adminScope: true, ...state });
      res.headers.set("X-Layout-Admin", "applied");
      trace.push("admin:exit");
      return res;
    });

    // Pathless layout (_auth.ts)
    const authLayout = t.layout("/_auth/*").use(async ({ req }, next) => {
      trace.push("auth:enter");
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return json({ error: "unauthorized" }, 401);
      }
      const res = await next({ user: "alice" });
      trace.push("auth:exit");
      return res;
    });

    // Route with route-level middleware (.use)
    const route = t
      .get("/admin/users/:id")
      .use(async (_args, next) => {
        trace.push("route-mw:enter");
        const res = await next({ audited: true });
        trace.push("route-mw:exit");
        return res;
      })
      .handler(async ({ req, state }) => {
        trace.push("handler");
        return json({
          userId: req.params.id,
          state,
        });
      });

    const app = createTaserApp({
      layouts: {
        "/*": rootLayout,
        "/admin/*": adminLayout,
        "/_auth/*": authLayout,
      },
      routes: {
        "/admin/users/:id": {
          GET: {
            layouts: ["/*", "/admin/*", "/_auth/*"],
            route,
          },
        },
      },
    });

    const res = await app.request("/admin/users/123", {
      headers: { authorization: "Bearer valid-token" },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Layout-Root")).toBe("applied");
    expect(res.headers.get("X-Layout-Admin")).toBe("applied");

    const data = await res.json();
    expect(data.userId).toBe("123");
    expect(data.state).toEqual({
      root: true,
      adminScope: true,
      user: "alice",
      audited: true,
    });

    expect(trace).toEqual([
      "root:enter",
      "admin:enter",
      "auth:enter",
      "route-mw:enter",
      "handler",
      "route-mw:exit",
      "auth:exit",
      "admin:exit",
      "root:exit",
    ]);
  });

  it("short-circuits early when a layout returns a Response, bypassing inner middlewares and handler", async () => {
    let handlerExecuted = false;
    let routeMwExecuted = false;

    const authLayout = t.layout("/_auth/*").use(async ({ req }, next) => {
      const auth = req.headers.get("authorization");
      if (!auth) {
        return json({ error: "missing auth header" }, 401);
      }
      return next();
    });

    const route = t
      .get("/guarded")
      .use(async (_args, next) => {
        routeMwExecuted = true;
        return next();
      })
      .handler(async () => {
        handlerExecuted = true;
        return json({ ok: true });
      });

    const app = createTaserApp({
      layouts: {
        "/_auth/*": authLayout,
      },
      routes: {
        "/guarded": {
          GET: {
            layouts: ["/_auth/*"],
            route,
          },
        },
      },
    });

    const res = await app.request("/guarded");
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("missing auth header");

    expect(routeMwExecuted).toBe(false);
    expect(handlerExecuted).toBe(false);
  });

  it("bubbles unhandled pipeline errors directly to Hono app.onError()", async () => {
    let honoErrorCaught: Error | null = null;

    const failingRoute = t
      .get("/fail")
      .use(async (_args, next) => {
        return next();
      })
      .handler(async () => {
        throw new Error("Pipeline exploded at endpoint");
      });

    const app = createTaserApp({
      routes: {
        "/fail": {
          GET: {
            route: failingRoute,
          },
        },
      },
    });

    app.onError((err, c) => {
      honoErrorCaught = err as Error;
      return c.json({ error: err.message, fromHono: true }, 500);
    });

    const res = await app.request("/fail");
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({
      error: "Pipeline exploded at endpoint",
      fromHono: true,
    });
    expect(honoErrorCaught).not.toBeNull();
    expect((honoErrorCaught as any)?.message).toBe("Pipeline exploded at endpoint");
  });

  it("extracts comprehensive req metadata backed by Hono c.req", async () => {
    let capturedReq: any = null;

    const route = t.get("/inspect/:category/:itemId").handler(({ req }) => {
      capturedReq = req;
      return json({ ok: true });
    });

    const app = createTaserApp({
      routes: {
        "/inspect/:category/:itemId": {
          GET: {
            route,
          },
        },
      },
    });

    const res = await app.request("/inspect/books/99?tag=fiction&tag=mystery&sort=asc", {
      headers: { "X-Test-Header": "unit-test" },
    });

    expect(res.status).toBe(200);
    expect(capturedReq).toBeDefined();
    expect(capturedReq.method).toBe("GET");
    expect(capturedReq.params).toEqual({ category: "books", itemId: "99" });
    expect(capturedReq.query).toEqual({
      tag: ["fiction", "mystery"],
      sort: "asc",
    });
    expect(capturedReq.headers.get("x-test-header")).toBe("unit-test");
    expect(capturedReq.url).toContain("/inspect/books/99");
    expect(capturedReq.raw).toBeInstanceOf(Request);
  });

  it("bubbles middleware-thrown errors directly to Hono app.onError()", async () => {
    let caughtError: Error | null = null;

    const route = t
      .get("/mw-fail")
      .use(async () => {
        throw new Error("Middleware exploded");
      })
      .handler(async () => json({ ok: true }));

    const app = createTaserApp({
      routes: {
        "/mw-fail": {
          GET: {
            route,
          },
        },
      },
    });

    app.onError((err, c) => {
      caughtError = err as Error;
      return c.json({ error: err.message, fromHono: true }, 500);
    });

    const res = await app.request("/mw-fail");
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({
      error: "Middleware exploded",
      fromHono: true,
    });
    expect(caughtError).not.toBeNull();
    expect((caughtError as any)?.message).toBe("Middleware exploded");
  });

  it("allows outer layout post-processing when inner layout short-circuits", async () => {
    const rootLayout = t.layout("/*").use(async (_args, next) => {
      const res = await next();
      res.headers.set("X-Root-PostProcessed", "true");
      return res;
    });

    const innerLayout = t.layout("/inner/*").use(async () => {
      return json({ error: "forbidden" }, 403);
    });

    const route = t.get("/nested-short-circuit").handler(async () => json({ ok: true }));

    const app = createTaserApp({
      layouts: {
        "/*": rootLayout,
        "/inner/*": innerLayout,
      },
      routes: {
        "/nested-short-circuit": {
          GET: {
            layouts: ["/*", "/inner/*"],
            route,
          },
        },
      },
    });

    const res = await app.request("/nested-short-circuit");
    expect(res.status).toBe(403);
    expect(res.headers.get("X-Root-PostProcessed")).toBe("true");
    const data = await res.json();
    expect(data.error).toBe("forbidden");
  });

  it("bubbles boot failure to Hono app.onError() on request", async () => {
    let caughtError: Error | null = null;

    const app = createTaserApp(
      {
        routes: {
          "/boot-fail": {
            GET: {
              route: t.get("/boot-fail").handler(async () => json({ ok: true })),
            },
          },
        },
      },
      defineTaser().context(
        createContext({
          boot: async () => {
            throw new Error("Failed to connect to database");
          },
        }),
      ),
    );

    app.onError((err, c) => {
      caughtError = err as Error;
      return c.json({ error: err.message, fromHono: true }, 500);
    });

    const res = await app.request("/boot-fail");
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({
      error: "Failed to connect to database",
      fromHono: true,
    });
    expect(caughtError).not.toBeNull();
    expect((caughtError as any)?.message).toBe("Failed to connect to database");
  });

  it("provides typed req.headers proxying to Hono request headers", async () => {
    let capturedAuth: string | null = null;
    let capturedContentType: string | null = null;
    let capturedCustom: string | null = null;
    let capturedMissing: string | null = null;
    let capturedHasCustom: boolean = false;

    const route = t.get("/headers-test").handler(async ({ req }) => {
      capturedAuth = req.headers.get("Authorization");
      capturedContentType = req.headers.get("Content-Type");
      capturedCustom = req.headers.get("X-Custom-Client");
      capturedMissing = req.headers.get("X-Non-Existent");
      capturedHasCustom = req.headers.has("X-Custom-Client");
      return json({ ok: true });
    });

    const app = createTaserApp({
      routes: {
        "/headers-test": {
          GET: { route },
        },
      },
    });

    const res = await app.request("/headers-test", {
      headers: {
        Authorization: "Bearer token-xyz",
        "Content-Type": "application/json",
        "X-Custom-Client": "my-client-app",
      },
    });

    expect(res.status).toBe(200);
    expect(capturedAuth).toBe("Bearer token-xyz");
    expect(capturedContentType).toBe("application/json");
    expect(capturedCustom).toBe("my-client-app");
    expect(capturedMissing).toBeNull();
    expect(capturedHasCustom).toBe(true);
  });
});

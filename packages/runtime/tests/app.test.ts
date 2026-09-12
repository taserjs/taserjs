import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { t } from "@taserjs/router";
import { created, json } from "@taserjs/utils";
import { createTaserApp } from "../src/index.js";

declare module "@taserjs/router" {
  interface RouterRegister {
    LayoutTree: {
      "/admin/*": any;
    };
  }
}

describe("createTaserApp and Hono runtime dispatch", () => {
  it("returns a native Hono app instance", () => {
    const app = createTaserApp({
      routes: {},
    });
    expect(app).toBeInstanceOf(Hono);
  });

  it("dispatches GET request to registered route handler and returns JSON response", async () => {
    const helloRoute = t
      .get("/hello")
      .handler(({ req }) => json({ message: "hello world", method: req.method }));

    const app = createTaserApp({
      routes: {
        "/hello": {
          GET: {
            route: helloRoute,
          },
        },
      },
    });

    const res = await app.request("/hello");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    const data = await res.json();
    expect(data).toEqual({ message: "hello world", method: "GET" });
  });

  it("extracts req.params and req.query from canonical route path", async () => {
    const userRoute = t.get("/users/:id").handler(({ req }) => {
      return json({
        userId: req.params.id,
        filter: req.query.filter,
      });
    });

    const app = createTaserApp({
      routes: {
        "/users/:id": {
          GET: {
            route: userRoute,
          },
        },
      },
    });

    const res = await app.request("/users/42?filter=active");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ userId: "42", filter: "active" });
  });

  it("extracts req.params._splat for wildcard routes", async () => {
    const fileRoute = t.get("/files/*").handler(({ req }) => {
      return json({
        splat: req.params._splat,
      });
    });

    const app = createTaserApp({
      routes: {
        "/files/*": {
          GET: {
            route: fileRoute,
          },
        },
      },
    });

    const res = await app.request("/files/docs/2026/spec.pdf");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ splat: "docs/2026/spec.pdf" });
  });

  it("supports multiple HTTP methods on different paths", async () => {
    const postRoute = t.post("/items").handler(({ req }) => {
      return created({ created: true, path: req.url });
    });

    const app = createTaserApp({
      routes: {
        "/items": {
          POST: {
            route: postRoute,
          },
        },
      },
    });

    const res = await app.request("/items", { method: "POST" });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.created).toBe(true);
  });

  it("exposes Hono context on ctx.context escape hatch", async () => {
    let capturedHonoContext: unknown = null;

    const route = t.get("/escape-hatch").handler(({ ctx }) => {
      capturedHonoContext = ctx.context;
      return json({ ok: true });
    });

    const app = createTaserApp({
      routes: {
        "/escape-hatch": {
          GET: {
            route,
          },
        },
      },
    });

    const res = await app.request("/escape-hatch");
    expect(res.status).toBe(200);
    expect(capturedHonoContext).toBeDefined();
    expect(typeof (capturedHonoContext as { req?: unknown }).req).toBe("object");
  });

  describe("Multi-method and catch-all route execution (app.all and app.on)", () => {
    it("dispatches requests of any HTTP method to t.all() handler via app.all", async () => {
      const allRoute = t.all("/proxy/*").handler(({ req }) => {
        return json({ method: req.method, path: req.path });
      });

      const app = createTaserApp({
        routes: {
          "/proxy/*": {
            ALL: {
              route: allRoute,
            },
          },
        },
      });

      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];
      for (const method of methods) {
        const res = await app.request("/proxy/service", { method });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.method).toBe(method);
      }
    });

    it("dispatches only specified methods for t.any() and returns 404 for other methods", async () => {
      const webhookRoute = t.any("/webhook", ["GET", "POST"]).handler(({ req }) => {
        return json({ webhookReceived: true, method: req.method });
      });

      const app = createTaserApp({
        routes: {
          "/webhook": {
            ANY: {
              route: webhookRoute,
            },
          },
        },
      });

      // Allowed methods
      const getRes = await app.request("/webhook", { method: "GET" });
      expect(getRes.status).toBe(200);
      expect((await getRes.json()).method).toBe("GET");

      const postRes = await app.request("/webhook", { method: "POST" });
      expect(postRes.status).toBe(200);
      expect((await postRes.json()).method).toBe("POST");

      // Disallowed method
      const deleteRes = await app.request("/webhook", { method: "DELETE" });
      expect(deleteRes.status).toBe(404);
    });

    it("dispatches HTTP QUERY, OPTIONS, and HEAD requests", async () => {
      const queryRoute = t.query("/search").handler(({ req }) => {
        return json({ queryExecuted: true, method: req.method });
      });

      const optionsRoute = t.options("/cors").handler(() => {
        return new Response(null, {
          status: 204,
          headers: { "allow": "GET, POST, OPTIONS" },
        });
      });

      const headRoute = t.head("/health").handler(() => {
        return new Response(null, {
          status: 200,
          headers: { "x-health": "ok" },
        });
      });

      const app = createTaserApp({
        routes: {
          "/search": {
            QUERY: {
              route: queryRoute,
            },
          },
          "/cors": {
            OPTIONS: {
              route: optionsRoute,
            },
          },
          "/health": {
            HEAD: {
              route: headRoute,
            },
          },
        },
      });

      const qRes = await app.request("/search", { method: "QUERY" });
      expect(qRes.status).toBe(200);
      expect((await qRes.json()).method).toBe("QUERY");

      const optRes = await app.request("/cors", { method: "OPTIONS" });
      expect(optRes.status).toBe(204);
      expect(optRes.headers.get("allow")).toBe("GET, POST, OPTIONS");

      const headRes = await app.request("/health", { method: "HEAD" });
      expect(headRes.status).toBe(200);
      expect(headRes.headers.get("x-health")).toBe("ok");
    });

    it("executes layout-scoped middleware and injects state and services into ctx.state and ctx.services", async () => {
      const adminLayout = t
        .layout("/admin/*")
        .use(async ({ req, ctx, state }, next) => {
          return await next.provide(
            { authService: { getRole: () => "superadmin" } },
            { user: "admin-1" },
          );
        });

      const adminMw = t
        .middleware("/admin/*")
        .handler(async ({ ctx }, next) => {
          // ctx.state and ctx.services are accessible
          expect(ctx.state).toBeDefined();
          expect((ctx.state as any).user).toBe("admin-1");
          expect(ctx.services).toBeDefined();
          expect((ctx.services as any).authService).toBeDefined();

          const authService = (ctx.services as any).authService;
          return await next({ role: authService.getRole() });
        });

      const adminRoute = t
        .get("/admin/users")
        .use(adminMw)
        .handler(({ ctx, state }) => {
          expect((ctx.state as any).role).toBe("superadmin");
          expect((ctx.services as any).authService).toBeDefined();
          return json({
            user: (ctx.state as any).user,
            role: state.role,
            fromService: (ctx.services as any).authService.getRole(),
          });
        });

      const app = createTaserApp({
        layouts: {
          "/admin/*": adminLayout,
        },
        routes: {
          "/admin/users": {
            GET: {
              layouts: ["/admin/*"],
              route: adminRoute,
            },
          },
        },
      });

      const res = await app.request("/admin/users");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({
        user: "admin-1",
        role: "superadmin",
        fromService: "superadmin",
      });
    });
    it("should route to HEAD handler when both GET and HEAD routes exist on the same path", async () => {
      const getRoute = t.get("/api/items").handler(() => {
        return json({ type: "get-items" }, { headers: { "x-route": "get" } });
      });

      const headRoute = t.head("/api/items").handler(() => {
        return new Response(null, {
          status: 200,
          headers: { "x-route": "head" },
        });
      });

      const app = createTaserApp({
        layouts: {},
        routes: {
          "/api/items": {
            GET: { layouts: [], route: getRoute },
            HEAD: { layouts: [], route: headRoute },
          },
        },
      });

      const headRes = await app.request("/api/items", { method: "HEAD" });
      expect(headRes.status).toBe(200);
      expect(headRes.headers.get("x-route")).toBe("head");

      const getRes = await app.request("/api/items", { method: "GET" });
      expect(getRes.status).toBe(200);
      expect(getRes.headers.get("x-route")).toBe("get");
      expect(await getRes.json()).toEqual({ type: "get-items" });
    });
  });
});

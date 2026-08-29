import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";

import {
  createContext,
  createTaserApp,
  defineMiddleware,
  type InferAppContext,
  type RouteManifestShape,
} from "../src/index.js";
import { internalServerError, json, notFound } from "../src/reply.js";
import "./register.js";

describe("createContext + createTaserApp", () => {
  it("infers AppContext from boot and request", () => {
    const context = createContext({
      boot: () => ({ db: "shared" as const }),
      request: () => ({ requestId: "r1" as string }),
    });
    type Ctx = InferAppContext<typeof context>;
    const sample: Ctx = { db: "shared", requestId: "r1" };
    expect(sample.db).toBe("shared");
    expectTypeOf(sample.requestId).toEqualTypeOf<string>();
  });

  it("runs boot once and request per handle", async () => {
    let bootCount = 0;
    let requestCount = 0;
    let capturedMethod = "";
    const context = createContext({
      boot: () => {
        bootCount += 1;
        return { bootId: bootCount };
      },
      request: (req: Request) => {
        requestCount += 1;
        capturedMethod = req.method;
        return { reqN: requestCount, methodFromReq: req.method };
      },
    });

    const t = createTaserApp().context(context);
    const route = t.get("/hello").handler((ctx) => {
      const merged = ctx as typeof ctx & { bootId: number; reqN: number };
      return json({ bootId: merged.bootId, reqN: merged.reqN });
    });
    const manifest = {
      layouts: {
        root: { middlewares: { layout: "root", middlewares: [] as const } },
      },
      routes: {
        "/hello": {
          GET: { layoutChain: ["root"], route },
        },
      },
    } satisfies RouteManifestShape;

    const app = t.create(manifest);
    const a = await (await app.fetch(new Request("http://localhost/hello")))!.json();
    const b = await (await app.fetch(new Request("http://localhost/hello")))!.json();

    expect(bootCount).toBe(1);
    expect(requestCount).toBe(2);
    expect(capturedMethod).toBe("GET");
    expect(a).toEqual({ bootId: 1, reqN: 1 });
    expect(b).toEqual({ bootId: 1, reqN: 2 });
  });

  it("skips response validation when response.validate is false", async () => {
    const strictT = createTaserApp({ response: { validate: true } }).context({});
    const route = strictT
      .get("/hello")
      .returns({ 200: z.object({ id: z.string() }) })
      // @ts-expect-error
      .handler(() => json({ id: 1 }));

    const manifest = {
      layouts: {
        root: { middlewares: { layout: "root", middlewares: [] as const } },
      },
      routes: {
        "/hello": {
          GET: { layoutChain: ["root"], route },
        },
      },
    } satisfies RouteManifestShape;

    const strict = strictT.create(manifest);
    const loose = createTaserApp({ response: { validate: false } })
      .context({})
      .create(manifest);

    const strictRes = await strict.fetch(new Request("http://localhost/hello"));
    expect(strictRes!.status).toBe(502);

    const looseRes = await loose.fetch(new Request("http://localhost/hello"));
    expect(looseRes!.status).toBe(200);
    expect(await looseRes!.json()).toEqual({ id: 1 });
  });

  it("wires onError from the app builder before create", async () => {
    const t = createTaserApp()
      .onError(() => internalServerError({ message: "builder-handled" }))
      .context({});

    const route = t.get("/hello").handler(() => {
      throw new Error("boom");
    });

    const manifest = {
      layouts: {},
      routes: {
        "/hello": {
          GET: { layoutChain: [], route },
        },
      },
    } satisfies RouteManifestShape;

    const app = t.create(manifest);
    const response = await app.fetch(new Request("http://localhost/hello"));
    expect(response!.status).toBe(500);
    expect(await response!.json()).toEqual({ message: "builder-handled" });
  });

  it("creates app without context()", async () => {
    const route = createTaserApp()
      .get("/hello")
      .handler(() => json({ ok: true }));
    const manifest = {
      layouts: {},
      routes: {
        "/hello": {
          GET: { layoutChain: [], route },
        },
      },
    } satisfies RouteManifestShape;

    const app = createTaserApp().create(manifest);
    const response = await app.fetch(new Request("http://localhost/hello"));
    expect(response!.status).toBe(200);
    expect(await response!.json()).toEqual({ ok: true });
  });

  it("chains onError and notFound before create", async () => {
    const t = createTaserApp()
      .context({})
      .onError(() => internalServerError({ message: "builder-handled" }))
      .notFound((_ctx) => notFound({ missing: true }));

    const route = t.get("/hello").handler(() => json({ ok: true }));
    const manifest = {
      layouts: {},
      routes: {
        "/hello": {
          GET: { layoutChain: [], route },
        },
      },
    } satisfies RouteManifestShape;

    const app = t.create(manifest);
    const missing = await app.fetch(new Request("http://localhost/missing"));
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ missing: true });
  });

  it("passes through on miss by default when notFound is not chained", async () => {
    const t = createTaserApp().context({});
    const route = t.get("/hello").handler(() => json({ ok: true }));
    const manifest = {
      layouts: {},
      routes: {
        "/hello": {
          GET: { layoutChain: [], route },
        },
      },
    } satisfies RouteManifestShape;

    const app = t.create(manifest);
    const missing = await app.fetch(new Request("http://localhost/missing"));
    expect(missing).toBeUndefined();
  });

  it("supports basePath option at app.create", async () => {
    const t = createTaserApp();
    const route = t.get("/hello").handler(() => json({ ok: true }));
    const manifest = {
      layouts: {},
      routes: {
        "/hello": {
          GET: { layoutChain: [], route },
        },
      },
    } satisfies RouteManifestShape;

    const app = t.create(manifest, { basePath: "/api" });
    const response = await app.fetch(new Request("http://localhost/api/hello"));
    expect(response!.status).toBe(200);
    expect(await response!.json()).toEqual({ ok: true });
  });

  it("supports app.request convenience helper", async () => {
    const t = createTaserApp().notFound(() => notFound({ error: "missing" }));

    const getRoute = t.get("/hello").handler(() => json([{ id: "item-1" }]));
    const postRoute = t.post("/search").handler(async (ctx) => {
      const data = await ctx.request.json();
      return json({ created: data }, { status: 201 });
    });

    const manifest = {
      layouts: {},
      routes: {
        "/hello": {
          GET: { layoutChain: [], route: getRoute },
        },
        "/search": {
          POST: { layoutChain: [], route: postRoute },
        },
      },
    } satisfies RouteManifestShape;

    const app = t.create(manifest);

    // GET with relative path
    const getRes = await app.request("/hello");
    expect(getRes.status).toBe(200);
    expect(await getRes.json()).toEqual([{ id: "item-1" }]);

    // POST with init
    const postRes = await app.request("/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Gadget" }),
    });
    expect(postRes.status).toBe(201);
    expect(await postRes.json()).toEqual({ created: { name: "Gadget" } });

    // 404 handler via request
    const notFoundRes = await app.request("/missing-path");
    expect(notFoundRes.status).toBe(404);
    expect(await notFoundRes.json()).toEqual({ error: "missing" });
  });
});

describe("middleware state injection", () => {
  const t = createTaserApp().context({});

  it("types and merges state onto the handler context", () => {
    const withAdmin = defineMiddleware((_ctx, next) => next({ adminDb: { name: "admin" } }));

    const route = t
      .get("/reports")
      .use(withAdmin)
      .handler((ctx) => {
        expectTypeOf(ctx.state.adminDb).toEqualTypeOf<{ name: string }>();
        return json({ name: ctx.state.adminDb.name });
      });

    expect(route.path).toBe("/reports");
  });

  it("supports next({ userId, flag }) multiple fields", () => {
    const mw = defineMiddleware((_ctx, next) => next({ userId: "u1", flag: true }));

    const route = t
      .get("/search")
      .use(mw)
      .handler((ctx) => {
        expectTypeOf(ctx.state.userId).toEqualTypeOf<string>();
        expectTypeOf(ctx.state.flag).toEqualTypeOf<boolean>();
        return json({ userId: ctx.state.userId, flag: ctx.state.flag });
      });

    expect(route.path).toBe("/search");
  });
});

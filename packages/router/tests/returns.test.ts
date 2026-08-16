import "./register.js";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  createTaserApp,
  defineHandler,
  defineMiddleware,
  reply,
  validationErrorSchema,
} from "../src/index.js";
import { createTaserRuntime } from "@taserjs/router-core";

describe("returns fluent API", () => {
  const t = createTaserApp().context({});

  it.each([
    {
      name: "middleware unit",
      build: () => {
        const auth = defineMiddleware({
          returns: { 401: z.object({ error: z.string() }) },
          handler: (_ctx, next) => next(),
        });
        return t
          .get("/hello")
          .use(auth)
          .returns({ 200: z.object({ ok: z.boolean() }) })
          .handler(() => reply.json({ ok: true }));
      },
      expectStatus: 401,
    },
    {
      name: "inline use",
      build: () =>
        t
          .get("/hello")
          .use({
            returns: { 403: z.object({ error: z.string() }) },
            handler: (_ctx, next) => next(),
          })
          .returns({ 200: z.object({ ok: z.boolean() }) })
          .handler(() => reply.json({ ok: true })),
      expectStatus: 403,
    },
    {
      name: "defineHandler unit",
      build: () => {
        const unit = defineHandler()
          .returns({ 404: z.object({ error: z.string() }) })
          .handler(() => reply.notFound({ error: "missing" }));
        return t
          .get("/hello")
          .returns({ 200: z.object({ id: z.string() }) })
          .handler(unit);
      },
      expectStatus: 404,
    },
    {
      name: "fluent middleware",
      build: () => {
        const auth = defineMiddleware({})
          .returns({ 401: z.object({ error: z.string() }) })
          .handler((_ctx, next) => next());
        return t
          .get("/hello")
          .use(auth)
          .returns({ 200: z.string() })
          .handler(() => reply.text("ok"));
      },
      expectStatus: 401,
    },
  ])("$name merges returns into route export", ({ build, expectStatus }) => {
    const route = build();
    expect(route.returns?.[200]).toBeDefined();
    expect(route.returns?.[expectStatus as keyof NonNullable<typeof route.returns>]).toBeDefined();
  });

  it("lets later route.returns override middleware status schema", () => {
    const pluginSchema = z.object({ error: z.literal("plugin") });
    const routeSchema = z.object({ error: z.literal("route") });

    const auth = defineMiddleware({
      returns: { 401: pluginSchema },
      handler: (_ctx, next) => next(),
    });

    const route = t
      .get("/hello")
      .use(auth)
      .returns({ 401: routeSchema, 200: z.object({ ok: z.boolean() }) })
      .handler(() => reply.json({ ok: true }));

    expect(route.returns?.[401]).toBe(routeSchema);
  });

  it("auto-injects 422 when input schemas exist", () => {
    const route = t
      .get("/search", {
        query: z.object({ page: z.string() }),
      })
      .returns({ 200: z.object({ ok: z.boolean() }) })
      .handler(() => reply.json({ ok: true }));

    expect(route.returns?.[422 as keyof typeof route.returns]).toBe(validationErrorSchema);
  });

  it("auto-injects 422 when route middleware defines input schemas", () => {
    const auth = defineMiddleware({
      query: z.object({ token: z.string() }),
      handler: (_ctx, next) => next(),
    });

    const route = t
      .get("/search")
      .use(auth)
      .returns({ 200: z.object({ ok: z.boolean() }) })
      .handler(() => reply.json({ ok: true }));

    expect(route.returns?.[422 as keyof typeof route.returns]).toBe(validationErrorSchema);
  });

  it("auto-injects 422 when handler middleware defines input schemas", () => {
    const unitMw = defineMiddleware({
      body: z.object({ name: z.string() }),
      handler: (_ctx, next) => next(),
    });
    const handler = defineHandler()
      .use(unitMw)
      .handler(() => reply.json({ ok: true }));

    const route = t
      .post("/")
      .returns({ 200: z.object({ ok: z.boolean() }) })
      .handler(handler);

    expect(route.returns?.[422 as keyof typeof route.returns]).toBe(validationErrorSchema);
  });

  it("does not auto-inject 422 when chain only declares returns", () => {
    const auth = defineMiddleware({
      returns: { 401: z.object({ error: z.string() }) },
      handler: (_ctx, next) => next(),
    });

    const route = t
      .get("/hello")
      .use(auth)
      .returns({ 200: z.object({ ok: z.boolean() }) })
      .handler(() => reply.json({ ok: true }));

    expect(route.returns?.[422 as keyof typeof route.returns]).toBeUndefined();
  });

  it("typechecks reply body against returns map", () => {
    t.get("/hello")
      .returns({ 200: z.object({ id: z.string() }) })
      .handler(() => reply.json({ id: "1" }));

    // Single .handler signature (fn | HandlerUnit): mismatch is reported without overload dump.
    t.get("/hello")
      .returns({ 200: z.object({ id: z.string() }) })
      // @ts-expect-error
      .handler(() => reply.json({ id: 1 }));

    t.get("/hello")
      .returns({
        200: z.object({ ok: z.boolean() }),
        400: z.string(),
      })
      .handler((ctx) => {
        if (!ctx.query) {
          return reply.badRequest("missing");
        }
        return reply.json({ ok: true });
      });
  });

  it("allows undeclared status codes when returns map is partial", () => {
    t.get("/hello")
      .returns({
        400: z.string().optional(),
      })
      .handler(() => reply.json({ ok: true }));

    t.get("/hello")
      .returns({ 400: z.string() })
      // @ts-expect-error declared 400 body must match schema
      .handler(() => reply.badRequest({ nope: true }));
  });
});

describe("pipeline response validation + onError", () => {
  const t = createTaserApp().context({});

  it("validates handler reply against returns map", async () => {
    const schema = z.object({ id: z.string() });
    const route = {
      path: "/hello",
      method: "GET" as const,
      middlewares: [],
      handlerMiddlewares: [],
      returns: { 200: schema },
      handler: () => reply.json({ id: 1 }),
    };

    const manifest = {
      layouts: {},
      routes: {
        "/hello": {
          GET: {
            layoutChain: [],
            route,
          },
        },
      },
    };
    const response = await createTaserRuntime(manifest, () => ({})).fetch(
      new Request("http://localhost/hello"),
    );
    expect(response.status).toBe(502);
  });

  it("merges layout middleware returns at runtime", async () => {
    const layoutMw = {
      returns: { 401: z.object({ error: z.string() }) },
      handler: () => reply.unauthorized({ error: "nope" }),
    };

    const route = t
      .get("/hello")
      .returns({ 200: z.object({ ok: z.boolean() }) })
      .handler(() => reply.json({ ok: true }));

    const manifest = {
      layouts: {
        auth: {
          middlewares: { middlewares: [layoutMw] },
        },
      },
      routes: {
        "/hello": {
          GET: {
            layoutChain: ["auth"],
            route,
          },
        },
      },
    };
    const response = await createTaserRuntime(manifest, () => ({})).fetch(
      new Request("http://localhost/hello"),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "nope" });
  });

  it("routes unexpected errors through onError", async () => {
    const route = t.get("/hello").handler(() => {
      throw new Error("explode");
    });

    const manifest = {
      layouts: {},
      routes: {
        "/hello": {
          GET: {
            layoutChain: [],
            route,
          },
        },
      },
    };

    const app = createTaserApp()
      .context({})
      .onError({
        responses: { 500: z.object({ message: z.string() }) },
        handle: () => reply.internalServerError({ message: "handled" }),
      })
      .create(manifest);

    const response = await app.fetch(new Request("http://localhost/hello"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "handled" });
  });
});

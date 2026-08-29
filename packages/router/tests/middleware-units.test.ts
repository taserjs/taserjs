import "./register.js";
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createTaserApp, defineMiddleware, honoMw } from "../src/index.js";
import { json, unauthorized } from "../src/reply.js";

describe("defineMiddleware units", () => {
  const t = createTaserApp().context({});

  it("supports fluent builder without schemas and infers next(state)", () => {
    const auth = defineMiddleware().handler((ctx, next) => {
      expectTypeOf(ctx.headers.get("Authorization")).toEqualTypeOf<string | undefined>();
      expectTypeOf(ctx.cookies.get("token")).toEqualTypeOf<string | undefined>();
      return next({ userId: "user-1" });
    });

    const route = t
      .get("/hello")
      .use(auth)
      .handler((ctx) => {
        expectTypeOf(ctx.state.userId).toEqualTypeOf<string>();
        return json({ userId: ctx.state.userId });
      });

    expect(route.middlewares).toHaveLength(1);
    expect(route.handlerMiddlewares).toHaveLength(0);
    expect(route.path).toBe("/hello");
    expect(route.method).toBe("GET");
  });

  it("supports fluent builder with query, params, body tagging, and returns", () => {
    const uploadSchema = z.object({ filename: z.string() });
    const querySchema = z.object({ tag: z.string() });
    const paramsSchema = z.object({ id: z.coerce.number() });
    const errorSchema = z.object({ error: z.string() });

    const uploadMw = defineMiddleware()
      .query(querySchema)
      .params(paramsSchema)
      .body("form", uploadSchema)
      .returns({ 400: errorSchema })
      .handler(async (ctx, next) => {
        expectTypeOf(ctx.query.tag).toEqualTypeOf<string>();
        expectTypeOf(ctx.params.id).toEqualTypeOf<number>();
        expectTypeOf(ctx.body.filename).toEqualTypeOf<string>();
        return next({ uploaded: true, filename: ctx.body.filename });
      });

    expect(uploadMw.bodyMode).toBe("form");
    expect(uploadMw.body).toBe(uploadSchema);
    expect(uploadMw.query).toBe(querySchema);
    expect(uploadMw.params).toBe(paramsSchema);
    expect(uploadMw.returns?.[400]).toBe(errorSchema);

    const route = t
      .post("/users/:id")
      .use(uploadMw)
      .returns({ 200: z.object({ ok: z.boolean() }) })
      .handler((ctx) => {
        expectTypeOf(ctx.state.uploaded).toEqualTypeOf<boolean>();
        expectTypeOf(ctx.state.filename).toEqualTypeOf<string>();
        return json({ ok: true });
      });

    expect(route.middlewares).toHaveLength(1);
  });

  it("defaults bodyMode to json when mode is omitted in .body()", () => {
    const jsonSchema = z.object({ title: z.string() });

    const jsonMw = defineMiddleware()
      .body(jsonSchema)
      .handler(async (ctx, next) => {
        expectTypeOf(ctx.body.title).toEqualTypeOf<string>();
        return next({ title: ctx.body.title });
      });

    expect(jsonMw.bodyMode).toBe("json");
    expect(jsonMw.body).toBe(jsonSchema);
  });

  it("supports .requires<TState>() on fluent builder for upstream preconditions", () => {
    type AuthState = { user: string };

    const requireUserMw = defineMiddleware()
      .requires<AuthState>()
      .handler((ctx, next) => {
        expectTypeOf(ctx.state.user).toEqualTypeOf<string>();
        return next({ active: true });
      });

    // Route under "/" inherits user: string from "index" layout
    const route = t
      .post("/")
      .use(requireUserMw)
      .handler((ctx) => {
        expectTypeOf(ctx.state.active).toEqualTypeOf<boolean>();
        return json({ active: ctx.state.active });
      });

    expect(route.middlewares).toHaveLength(1);
  });

  it("supports layout-scoped fluent builder with state inheritance", () => {
    const userMiddleware = defineMiddleware("index")
      .query(z.object({ filter: z.string() }))
      .handler((ctx, next) => {
        // Inherits user: string from "index" layout
        expectTypeOf(ctx.state.user).toEqualTypeOf<string>();
        expectTypeOf(ctx.query.filter).toEqualTypeOf<string>();
        return next({ role: "admin" });
      });

    const route = t
      .post("/")
      .use(userMiddleware)
      .handler((ctx) => {
        expectTypeOf(ctx.state.user).toEqualTypeOf<string>();
        expectTypeOf(ctx.state.role).toEqualTypeOf<string>();
        return json({ user: ctx.state.user, role: ctx.state.role });
      });

    expect(route.middlewares).toHaveLength(1);
  });

  it("supports multi-layout scoped fluent builder with branch union", () => {
    const multiLayoutMiddleware = defineMiddleware(["index", "admin"]).handler((ctx, next) => {
      // Both index and admin provide user: string
      expectTypeOf(ctx.state.user).toEqualTypeOf<string>();
      return next({ permission: "read" });
    });

    const route1 = t
      .post("/")
      .use(multiLayoutMiddleware)
      .handler((ctx) => {
        expectTypeOf(ctx.state.permission).toEqualTypeOf<string>();
        return json({ ok: true });
      });

    const route2 = t
      .get("/check-ctx")
      .use(multiLayoutMiddleware)
      .handler((ctx) => {
        expectTypeOf(ctx.state.permission).toEqualTypeOf<string>();
        return json({ ok: true });
      });

    expect(route1.middlewares).toHaveLength(1);
    expect(route2.middlewares).toHaveLength(1);
  });

  it("supports short function signature defineMiddleware((ctx, next) => ...) with state inference", () => {
    const auth = defineMiddleware((ctx, next) => {
      expectTypeOf(ctx.headers.get("Authorization")).toEqualTypeOf<string | undefined>();
      expectTypeOf(ctx.cookies.get("token")).toEqualTypeOf<string | undefined>();
      return next({ userId: "user-short" });
    });

    const route = t
      .get("/hello")
      .use(auth)
      .handler((ctx) => {
        expectTypeOf(ctx.state.userId).toEqualTypeOf<string>();
        return json({ userId: ctx.state.userId });
      });

    expect(route.middlewares).toHaveLength(1);
    expect(route.handlerMiddlewares).toHaveLength(0);
    expect(route.path).toBe("/hello");
    expect(route.method).toBe("GET");
  });

  it("supports short function signature with explicit generic state defineMiddleware<TState>((ctx, next) => ...)", () => {
    type UserState = { user: { id: string; role: "admin" | "user" } };

    const auth = defineMiddleware<UserState>((_ctx, next) => {
      return next({ user: { id: "u-1", role: "admin" } });
    });

    const route = t
      .get("/hello")
      .use(auth)
      .handler((ctx) => {
        expectTypeOf(ctx.state.user).toEqualTypeOf<{ id: string; role: "admin" | "user" }>();
        return json({ user: ctx.state.user });
      });

    expect(route.middlewares).toHaveLength(1);
  });

  it("supports short function signature layout-scoped defineMiddleware(layout, (ctx, next) => ...)", () => {
    const userMiddleware = defineMiddleware("index", (ctx, next) => {
      expectTypeOf(ctx.state.user).toEqualTypeOf<string>();
      return next({ role: "admin" });
    });

    const route = t
      .post("/")
      .use(userMiddleware)
      .handler((ctx) => {
        expectTypeOf(ctx.state.user).toEqualTypeOf<string>();
        expectTypeOf(ctx.state.role).toEqualTypeOf<string>();
        return json({ user: ctx.state.user, role: ctx.state.role });
      });

    expect(route.middlewares).toHaveLength(1);
  });

  it("supports short function signature multi-layout scoped defineMiddleware(layouts, (ctx, next) => ...)", () => {
    const multiLayoutMiddleware = defineMiddleware(["index", "admin"], (ctx, next) => {
      expectTypeOf(ctx.state.user).toEqualTypeOf<string>();
      return next({ permission: "write" });
    });

    const route1 = t
      .post("/")
      .use(multiLayoutMiddleware)
      .handler((ctx) => {
        expectTypeOf(ctx.state.permission).toEqualTypeOf<string>();
        return json({ ok: true });
      });

    expect(route1.middlewares).toHaveLength(1);
  });

  it("accepts plain function middleware with .use((ctx, next) => ...)", () => {
    const route = t
      .get("/hello")
      .use((_ctx, next) => next({ plainState: "computed" }))
      .handler((ctx) => {
        expectTypeOf(ctx.state.plainState).toEqualTypeOf<string>();
        return json({ plainState: ctx.state.plainState });
      });

    expect(route.middlewares).toHaveLength(1);
    expect(typeof route.middlewares[0]?.handler).toBe("function");
  });

  it("accepts plain function middleware on layout middleware chain", () => {
    const middlewareChain = t.middleware("index").use((_ctx, next) => next({ layoutPlain: 123 }));

    expect(middlewareChain.middlewares).toHaveLength(1);
    expect(typeof middlewareChain.middlewares[0]?.handler).toBe("function");
  });

  it("accepts a Hono middleware wrapped in honoMw() via defineMiddleware and .use()", () => {
    const customHonoMw = honoMw(async (c, next) => {
      c.header("Access-Control-Allow-Origin", "*");
      c.set("honoVar", 123);
      return next();
    });

    const corsUnit = defineMiddleware(customHonoMw);

    const route = t
      .get("/hello")
      .use(corsUnit)
      .use(
        honoMw(async (c, next) => {
          c.header("X-Direct-Hono", "true");
          return next();
        }),
      )
      .handler((ctx) => {
        return json({ ok: ctx.var });
      });

    expect(route.middlewares).toHaveLength(2);
    expect(typeof route.middlewares[0]?.handler).toBe("function");
    expect(typeof route.middlewares[1]?.handler).toBe("function");
  });

  it("handles early return in middleware while inferring next state", () => {
    const auth = defineMiddleware().handler((_ctx, next) => {
      const authed = false;
      if (!authed) {
        return unauthorized({ error: "Unauthorized" });
      }
      return next({ session: "active" });
    });

    const route = t
      .get("/hello")
      .use(auth)
      .handler((ctx) => {
        expectTypeOf(ctx.state.session).toEqualTypeOf<string>();
        return json({ session: ctx.state.session });
      });

    expect(route.middlewares).toHaveLength(1);
  });

  it("rejects layout-scoped middleware when attached to unrelated route branch", () => {
    const indexOnlyMiddleware = defineMiddleware("index", (_ctx, next) =>
      next({ fromIndex: true }),
    );

    // @ts-expect-error - Route "/hello" does not inherit "index" layout
    t.get("/hello").use(indexOnlyMiddleware);
  });

  it("rejects state-required middleware when route does not provide required state", () => {
    type RequiresToken = { token: string };

    const requireTokenMw = defineMiddleware()
      .requires<RequiresToken>()
      .handler((ctx, next) => {
        expectTypeOf(ctx.state.token).toEqualTypeOf<string>();
        return next({ validated: true });
      });

    // @ts-expect-error - Route "/hello" does not have state.token
    t.get("/hello").use(requireTokenMw);
  });
});

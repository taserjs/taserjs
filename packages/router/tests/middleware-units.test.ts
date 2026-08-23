import "./register.js";
import { describe, expect, expectTypeOf, it } from "vitest";

import { createTaserApp, defineMiddleware } from "../src/index.js";
import { json, unauthorized } from "../src/reply.js";

describe("defineMiddleware units", () => {
  const t = createTaserApp().context({});

  it("infers state from next(state) without schemas", () => {
    const auth = defineMiddleware({
      handler: (ctx, next) => {
        expectTypeOf(ctx.headers.get("Authorization")).toEqualTypeOf<string | undefined>();
        expectTypeOf(ctx.cookies.get("token")).toEqualTypeOf<string | undefined>();
        return next({ userId: "user-1" });
      },
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

  it("enforces explicit TState on next(state) when provided", () => {
    type UserState = { user: { id: string; role: "admin" | "user" } };

    const auth = defineMiddleware<UserState>({
      handler: (_ctx, next) => {
        return next({ user: { id: "u-1", role: "admin" } });
      },
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

  it("accepts inline middleware with direct next(state)", () => {
    const route = t
      .get("/hello")
      .use({
        handler: (_ctx, next) => next({ count: 42 }),
      })
      .handler((ctx) => {
        expectTypeOf(ctx.state.count).toEqualTypeOf<number>();
        return json({ count: ctx.state.count });
      });

    expect(route.middlewares).toHaveLength(1);
  });

  it("accumulates state across layout and route middlewares", () => {
    const layoutMw = defineMiddleware({
      handler: (_ctx, next) => next({ layoutId: "main" }),
    });

    const routeMw = defineMiddleware({
      handler: (_ctx, next) => next({ routeId: "hello" }),
    });

    const layout = t.middleware("index").use(layoutMw);
    expect(layout.middlewares).toHaveLength(1);
    expect(layout.layout).toBe("index");

    const route = t
      .get("/hello")
      .use(routeMw)
      .handler((ctx) => {
        expectTypeOf(ctx.state.routeId).toEqualTypeOf<string>();
        return json({ ok: true });
      });

    expect(route.middlewares).toHaveLength(1);
  });

  it("accepts MiddlewareUnit with next() no args on layout middleware chain", () => {
    const gate = defineMiddleware({
      handler: (_ctx, next) => next(),
    });

    const middlewares = t.middleware("index").use(gate);
    expect(middlewares.middlewares).toHaveLength(1);
    expect(middlewares.layout).toBe("index");
  });

  it("accepts a Hono middleware function", () => {
    const cors = defineMiddleware(async (c, next) => {
      c.header("Access-Control-Allow-Origin", "*");
      return next();
    });

    const route = t
      .get("/hello")
      .use(cors)
      .handler((ctx) => {
        return json({ ok: ctx.var });
      });

    expect(route.middlewares).toHaveLength(1);
    expect(typeof route.middlewares[0]?.handler).toBe("function");
  });

  it("handles early return in middleware while inferring next state", () => {
    const auth = defineMiddleware({
      handler: (_ctx, next) => {
        const authed = false;
        if (!authed) {
          return unauthorized({ error: "Unauthorized" });
        }
        return next({ session: "active" });
      },
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

  it("supports single layout-scoped defineMiddleware with inherited state", () => {
    const userMiddleware = defineMiddleware("index", {
      handler: (ctx, next) => {
        // Inherits user: string from "index" layout
        expectTypeOf(ctx.state.user).toEqualTypeOf<string>();
        return next({ role: "admin" });
      },
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

  it("supports multi-layout scoped defineMiddleware with common inherited state", () => {
    const multiLayoutMiddleware = defineMiddleware(["index", "admin"], {
      handler: (ctx, next) => {
        // Both index and admin provide user: string
        expectTypeOf(ctx.state.user).toEqualTypeOf<string>();
        return next({ permission: "read" });
      },
    });

    // Allowed on route inheriting "index"
    const route1 = t
      .post("/")
      .use(multiLayoutMiddleware)
      .handler((ctx) => {
        expectTypeOf(ctx.state.permission).toEqualTypeOf<string>();
        return json({ ok: true });
      });

    // Allowed on route inheriting "admin"
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

  it("supports state-requirement generic on defineMiddleware", () => {
    type RequiresUser = { user: string };

    const requireUserMw = defineMiddleware<{ active: boolean }, RequiresUser>({
      handler: (ctx, next) => {
        expectTypeOf(ctx.state.user).toEqualTypeOf<string>();
        return next({ active: true });
      },
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

  it("rejects layout-scoped middleware when attached to unrelated route branch", () => {
    const indexOnlyMiddleware = defineMiddleware("index", {
      handler: (_ctx, next) => next({ fromIndex: true }),
    });

    // @ts-expect-error - Route "/hello" does not inherit "index" layout
    t.get("/hello").use(indexOnlyMiddleware);
  });

  it("rejects state-required middleware when route does not provide required state", () => {
    type RequiresToken = { token: string };

    const requireTokenMw = defineMiddleware<{ validated: boolean }, RequiresToken>({
      handler: (ctx, next) => {
        expectTypeOf(ctx.state.token).toEqualTypeOf<string>();
        return next({ validated: true });
      },
    });

    // @ts-expect-error - Route "/hello" does not have state.token
    t.get("/hello").use(requireTokenMw);
  });
});

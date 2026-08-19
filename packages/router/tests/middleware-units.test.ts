import "./register.js";
import { describe, expect, expectTypeOf, it } from "vitest";

import { createTaserApp, defineMiddleware, reply } from "../src/index.js";

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
        return reply.json({ userId: ctx.state.userId });
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
        return reply.json({ user: ctx.state.user });
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
        return reply.json({ count: ctx.state.count });
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
        return reply.json({ ok: true });
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
        return reply.json({ ok: ctx.var });
      });

    expect(route.middlewares).toHaveLength(1);
    expect(typeof route.middlewares[0]?.handler).toBe("function");
  });

  it("handles early return in middleware while inferring next state", () => {
    const auth = defineMiddleware({
      handler: (_ctx, next) => {
        const authed = false;
        if (!authed) {
          return reply.unauthorized({ error: "Unauthorized" });
        }
        return next({ session: "active" });
      },
    });

    const route = t
      .get("/hello")
      .use(auth)
      .handler((ctx) => {
        expectTypeOf(ctx.state.session).toEqualTypeOf<string>();
        return reply.json({ session: ctx.state.session });
      });

    expect(route.middlewares).toHaveLength(1);
  });
});

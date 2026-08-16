import "./register.js";
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createTaserApp, defineMiddleware, reply } from "../src/index.js";

describe("defineMiddleware units", () => {
  const t = createTaserApp().context({});

  it("preserves state Acc when mounted on a route", () => {
    const auth = defineMiddleware({
      state: z.object({ userId: z.string() }),
      handler: (ctx, next) => {
        expectTypeOf(ctx.headers.get("Authorization")).toEqualTypeOf<string | undefined>();
        expectTypeOf(ctx.cookies.get("token")).toEqualTypeOf<string | undefined>();
        return next({ state: { userId: "user-1" } });
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

  it("accepts MiddlewareUnit on layout middleware chain", () => {
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
});

import "./register.js";
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createTaserApp, defineHandler, defineMiddleware, reply } from "../src/index.js";

describe("defineHandler units", () => {
  const t = createTaserApp().context({});

  it("types standalone handler schemas only", () => {
    const handler = defineHandler({
      query: z.object({ page: z.number().optional() }),
    }).handler((ctx) => {
      expectTypeOf(ctx.query.page).toEqualTypeOf<number | undefined>();
      return reply.json({ page: ctx.query.page });
    });

    expect(handler.middlewares).toHaveLength(0);
    expect(handler.query).toBeDefined();
  });

  it("binds middleware Acc into handler context", () => {
    const auth = defineMiddleware({
      state: z.object({ role: z.string() }),
      handler: (_ctx, next) => next({ state: { role: "admin" } }),
    });

    const handler = defineHandler({
      query: z.object({ q: z.string().optional() }),
    })
      .use(auth)
      .handler((ctx) => {
        expectTypeOf(ctx.state.role).toEqualTypeOf<string>();
        expectTypeOf(ctx.query.q).toEqualTypeOf<string | undefined>();
        return reply.json({ role: ctx.state.role });
      });

    expect(handler.middlewares).toHaveLength(1);

    const route = t.get("/search").handler(handler);
    expect(route.middlewares).toHaveLength(0);
    expect(route.handlerMiddlewares).toHaveLength(1);
    expect(route.handlerQuery).toBeDefined();
  });

  it("composes route use then handler unit middlewares", () => {
    const routeMw = defineMiddleware({
      state: z.object({ a: z.number() }),
      handler: (_ctx, next) => next({ state: { a: 1 } }),
    });
    const handlerMw = defineMiddleware({
      state: z.object({ b: z.number() }),
      handler: (_ctx, next) => next({ state: { b: 2 } }),
    });

    const handler = defineHandler()
      .use(handlerMw)
      .handler(() => reply.json({ ok: true }));
    const route = t.get("/reports").use(routeMw).handler(handler);

    expect(route.middlewares).toHaveLength(1);
    expect(route.handlerMiddlewares).toHaveLength(1);
  });
});

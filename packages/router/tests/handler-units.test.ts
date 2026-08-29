import "./register.js";
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createTaserApp, defineHandler, defineMiddleware } from "../src/index.js";
import { json } from "../src/reply.js";

describe("defineHandler units", () => {
  const t = createTaserApp().context({});

  it("types standalone handler schemas only", () => {
    const handler = defineHandler({
      query: z.object({ page: z.number().optional() }),
    }).handler((ctx) => {
      expectTypeOf(ctx.query.page).toEqualTypeOf<number | undefined>();
      return json({ page: ctx.query.page });
    });

    expect(handler.middlewares).toHaveLength(0);
    expect(handler.query).toBeDefined();
  });

  it("binds middleware Acc into handler context", () => {
    const auth = defineMiddleware({
      handler: (_ctx, next) => next({ role: "admin" }),
    });

    const handler = defineHandler({
      query: z.object({ q: z.string().optional() }),
    })
      .use(auth)
      .handler((ctx) => {
        expectTypeOf(ctx.state.role).toEqualTypeOf<string>();
        expectTypeOf(ctx.query.q).toEqualTypeOf<string | undefined>();
        return json({ role: ctx.state.role });
      });

    expect(handler.middlewares).toHaveLength(1);

    const route = t.get("/search").handler(handler);
    expect(route.middlewares).toHaveLength(0);
    expect(route.handlerMiddlewares).toHaveLength(1);
    expect(route.handlerQuery).toBeDefined();
  });

  it("accepts plain function middleware in defineHandler .use((ctx, next) => ...)", () => {
    const handler = defineHandler()
      .use((_ctx, next) => next({ handlerPlainState: true }))
      .handler((ctx) => {
        expectTypeOf(ctx.state.handlerPlainState).toEqualTypeOf<boolean>();
        return json({ ok: ctx.state.handlerPlainState });
      });

    expect(handler.middlewares).toHaveLength(1);
    expect(typeof handler.middlewares[0]?.handler).toBe("function");

    const route = t.get("/hello").handler(handler);
    expect(route.handlerMiddlewares).toHaveLength(1);
  });

  it("composes route use then handler unit middlewares", () => {
    const routeMw = defineMiddleware({
      handler: (_ctx, next) => next({ a: 1 }),
    });
    const handlerMw = defineMiddleware({
      handler: (_ctx, next) => next({ b: 2 }),
    });

    const handler = defineHandler()
      .use(handlerMw)
      .handler(() => json({ ok: true }));
    const route = t.get("/reports").use(routeMw).handler(handler);

    expect(route.middlewares).toHaveLength(1);
    expect(route.handlerMiddlewares).toHaveLength(1);
  });
});

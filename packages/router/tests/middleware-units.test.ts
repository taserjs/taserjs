import "./register.js";
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { middleware, honoMw, t } from "../src/index.js";
import { cors } from "../src/middleware/cors.js";
import { json, unauthorized } from "../src/reply.js";

describe("middleware units", () => {
  it("supports fluent builder without schemas and infers next(state)", () => {
    const auth = middleware().handler((ctx, next) => {
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
    expect(route.path).toBe("/hello");
    expect(route.method).toBe("GET");
  });

  it("supports fluent builder with query, params, body tagging, and returns", () => {
    const uploadSchema = z.object({ filename: z.string() });
    const querySchema = z.object({ tag: z.string() });
    const paramsSchema = z.object({ id: z.coerce.number() });
    const errorSchema = z.object({ error: z.string() });

    const uploadMw = middleware()
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

    const jsonMw = middleware()
      .body(jsonSchema)
      .handler(async (ctx, next) => {
        expectTypeOf(ctx.body.title).toEqualTypeOf<string>();
        return next({ title: ctx.body.title });
      });

    expect(jsonMw.bodyMode).toBe("json");
    expect(jsonMw.body).toBe(jsonSchema);
  });

  it("supports .requires<TRequires>() on fluent builder for upstream preconditions", () => {
    type AuthState = { user: string };

    const requireUserMw = middleware()
      .requires<{ state: AuthState }>()
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
    const userMiddleware = middleware("index")
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
    const multiLayoutMiddleware = middleware(["index", "admin"]).handler((ctx, next) => {
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

  it("supports short function signature middleware((ctx, next) => ...) with state inference", () => {
    const auth = middleware((ctx, next) => {
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
    expect(route.path).toBe("/hello");
    expect(route.method).toBe("GET");
  });

  it("supports short function signature with explicit generic state middleware<TState>((ctx, next) => ...)", () => {
    type UserState = { user: { id: string; role: "admin" | "user" } };

    const auth = middleware<UserState>((_ctx, next) => {
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

  it("supports short function signature layout-scoped middleware(layout, (ctx, next) => ...)", () => {
    const userMiddleware = middleware("index", (ctx, next) => {
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

  it("supports short function signature multi-layout scoped middleware(layouts, (ctx, next) => ...)", () => {
    const multiLayoutMiddleware = middleware(["index", "admin"], (ctx, next) => {
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
    const middlewareChain = t.layout("index").use((_ctx, next) => next({ layoutPlain: 123 }));

    expect(middlewareChain.middlewares).toHaveLength(1);
    expect(typeof middlewareChain.middlewares[0]?.handler).toBe("function");
  });

  it("accepts a Hono middleware wrapped in honoMw() via middleware and .use()", () => {
    const customHonoMw = honoMw(async (c, next) => {
      c.header("Access-Control-Allow-Origin", "*");
      c.set("honoVar", 123);
      return next();
    });

    const corsUnit = middleware(customHonoMw);

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
        // @ts-expect-error - var is not a valid property on the context
        return json({ ok: ctx.var });
      });

    expect(route.middlewares).toHaveLength(2);
    expect(typeof route.middlewares[0]?.handler).toBe("function");
    expect(typeof route.middlewares[1]?.handler).toBe("function");
  });

  it("handles early return in middleware while inferring next state", () => {
    const auth = middleware().handler((_ctx, next) => {
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
    const indexOnlyMiddleware = middleware("index", (_ctx, next) => next({ fromIndex: true }));

    // @ts-expect-error - Route "/hello" does not inherit "index" layout
    t.get("/hello").use(indexOnlyMiddleware);
  });

  it("supports validation-only middleware without handler on route and layout", () => {
    const paginationMw = middleware().query(
      z.object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(20),
      }),
    );

    const route = t
      .get("/hello")
      .use(paginationMw)
      .handler((ctx) => {
        expectTypeOf(ctx.query.page).toEqualTypeOf<number>();
        expectTypeOf(ctx.query.limit).toEqualTypeOf<number>();
        return json({ page: ctx.query.page, limit: ctx.query.limit });
      });

    expect(route.middlewares).toHaveLength(1);
    expect(route.middlewares[0]?.query).toBeDefined();
    expect(route.middlewares[0]?.handler).toBeUndefined();

    const layoutMw = t.layout("index").use(paginationMw);
    expect(layoutMw.middlewares).toHaveLength(1);
    expect(layoutMw.middlewares[0]?.query).toBeDefined();
    expect(layoutMw.middlewares[0]?.handler).toBeUndefined();
  });

  it("supports explicit generic state on fluent middleware builder with branching return next()", () => {
    const mw = t
      .middleware<{ type: "yes" | "no" }>()
      .query(z.object({ filter: z.string() }))
      .handler((ctx, next) => {
        if (ctx.query.filter === "yes") {
          return next({ type: "yes" as const });
        }
        return next({ type: "no" as const });
      });

    const route = t
      .get("/reports")
      .use(mw)
      .handler((ctx) => {
        expectTypeOf(ctx.state.type).toEqualTypeOf<"yes" | "no">();
        return json({ type: ctx.state.type });
      });

    expect(route.middlewares).toHaveLength(1);
    expect(route.middlewares[0]?.query).toBeDefined();
  });

  it("automatically infers union state across branching next() calls without generics", () => {
    const mw = t
      .middleware()
      .query(z.object({ filter: z.string() }))
      .handler((ctx, next) => {
        if (ctx.query.filter === "yes") {
          return next({ type: "yes" as const });
        }
        return next({ type: "no" as const });
      });

    const route = t
      .get("/search")
      .use(mw)
      .handler((ctx) => {
        expectTypeOf(ctx.state).toEqualTypeOf<{ type: "yes" } | { type: "no" }>();
        expectTypeOf(ctx.state.type).toEqualTypeOf<"yes" | "no">();
        return json({ type: ctx.state.type });
      });

    expect(route.middlewares).toHaveLength(1);
  });

  it("accumulates state correctly when chaining cors() with stateful middlewares", () => {
    const layout = t
      .layout("index")
      .use(cors())
      .use((_ctx, next) => next({ appName: "test-app" }));

    expect(layout.middlewares).toHaveLength(2);

    const route = t
      .get("/hello")
      .use(cors())
      .use((_ctx, next) => next({ user: "alice" }))
      .handler((ctx) => {
        expectTypeOf(ctx.state.user).toEqualTypeOf<string>();
        return json({ user: ctx.state.user });
      });

    expect(route.middlewares).toHaveLength(2);
  });

  it("preserves upstream layout state when route adds .use(cors())", () => {
    const route = t
      .get("/check-ctx")
      .use(cors())
      .handler((ctx) => {
        expectTypeOf(ctx.state.user).toEqualTypeOf<string>();
        expectTypeOf(ctx.query.page).toEqualTypeOf<number>();
        return json({ user: ctx.state.user });
      });

    expect(route.middlewares).toHaveLength(1);
  });

  it("enforces strict phased route builder where .use() is only valid before contract/schemas", () => {
    // Valid: Multiple .use() chained at the start
    const validRoute = t
      .post("/users/:id")
      .use((_ctx, next) => next({ step1: true }))
      .use((_ctx, next) => next({ step2: true }))
      .query(z.object({ filter: z.string() }))
      .params(z.object({ id: z.string() }))
      .body(z.object({ name: z.string() }))
      .returns({ 200: z.object({ ok: z.boolean() }) })
      .handler((ctx) => {
        expectTypeOf(ctx.state.step1).toEqualTypeOf<boolean>();
        expectTypeOf(ctx.state.step2).toEqualTypeOf<boolean>();
        expectTypeOf(ctx.query.filter).toEqualTypeOf<string>();
        expectTypeOf(ctx.params.id).toEqualTypeOf<string>();
        expectTypeOf(ctx.body.name).toEqualTypeOf<string>();
        return json({ ok: true });
      });

    expect(validRoute.middlewares).toHaveLength(2);

    // Invalid: .use() after .query() is not allowed by TypeScript
    const queryBuilder = t.get("/hello").query(z.object({ tag: z.string() }));
    // @ts-expect-error - .use() cannot be called after .query()
    queryBuilder.use((_ctx, next) => next());

    // Invalid: .use() after .returns() is not allowed by TypeScript
    const returnsBuilder = t.get("/hello").returns({ 200: z.object({ ok: z.boolean() }) });
    // @ts-expect-error - .use() cannot be called after .returns()
    returnsBuilder.use((_ctx, next) => next());
  });

  it("supports faceted .requires<{ params: ... }>() verifying path params from URL string", () => {
    const userParamMw = middleware()
      .requires<{ params: { id: string } }>()
      .handler((ctx, next) => {
        expectTypeOf(ctx.params.id).toEqualTypeOf<string>();
        return next({ loadedUserId: ctx.params.id });
      });

    // Allowed: Route "/users/:id" has path param :id
    const route = t
      .post("/users/:id")
      .use(userParamMw)
      .handler((ctx) => {
        expectTypeOf(ctx.state.loadedUserId).toEqualTypeOf<string>();
        return json({ userId: ctx.state.loadedUserId });
      });

    expect(route.middlewares).toHaveLength(1);

    // @ts-expect-error - Route "/hello" does not satisfy required params: { id: string }
    t.get("/hello").use(userParamMw);
  });

  it("supports faceted .requires<{ query: ... }>() verifying query from upstream layout", () => {
    const requirePageMw = middleware()
      .requires<{ query: { page: number } }>()
      .handler((ctx, next) => {
        expectTypeOf(ctx.query.page).toEqualTypeOf<number>();
        return next({ pageNumber: ctx.query.page });
      });

    // Allowed: Route "/check-ctx" inherits page: number from "admin" / "index" layout
    const route = t
      .get("/check-ctx")
      .use(requirePageMw)
      .handler((ctx) => {
        expectTypeOf(ctx.state.pageNumber).toEqualTypeOf<number>();
        return json({ page: ctx.state.pageNumber });
      });

    expect(route.middlewares).toHaveLength(1);

    // @ts-expect-error - Route "/hello" has no upstream query { page: number }
    t.get("/hello").use(requirePageMw);
  });
});

import { describe, it, expect } from "vitest";
import { t } from "../src/index.js";

describe("Route builder (t.get, t.post, t.put, t.delete, t.patch)", () => {
  it("builds a GET route definition with method, path, and handler", () => {
    const handler = () => new Response("ok");
    const route = t.get("/hello").handler(handler);

    expect(route).toBeDefined();
    expect(route.kind).toBe("route");
    expect(route.method).toBe("GET");
    expect(route.path).toBe("/hello");
    expect(route.handler).toBe(handler);
  });

  it("builds POST, PUT, DELETE, and PATCH route definitions", () => {
    const dummyHandler = () => new Response("ok");

    const postRoute = t.post("/items").handler(dummyHandler);
    expect(postRoute.method).toBe("POST");
    expect(postRoute.path).toBe("/items");
    expect(postRoute.kind).toBe("route");

    const putRoute = t.put("/items/:id").handler(dummyHandler);
    expect(putRoute.method).toBe("PUT");
    expect(putRoute.path).toBe("/items/:id");

    const deleteRoute = t.delete("/items/:id").handler(dummyHandler);
    expect(deleteRoute.method).toBe("DELETE");
    expect(deleteRoute.path).toBe("/items/:id");

    const patchRoute = t.patch("/items/:id").handler(dummyHandler);
    expect(patchRoute.method).toBe("PATCH");
    expect(patchRoute.path).toBe("/items/:id");
  });

  it("supports .use() middleware registration on route builder", () => {
    const mw1 = async (_args: any, next: any) => next();
    const mw2 = async (_args: any, next: any) => next();
    const handler = () => new Response("ok");

    const route = t.get("/test").use(mw1).use(mw2).handler(handler);

    expect(route.kind).toBe("route");
    expect(route.middlewares).toHaveLength(2);
    expect(route.middlewares?.[0]).toEqual({ kind: "middleware", handler: mw1 });
    expect(route.middlewares?.[1]).toEqual({ kind: "middleware", handler: mw2 });
  });

  it("builds a layout with t.layout(path) and registers middlewares via .use()", () => {
    const mw1 = async (_args: any, next: any) => next();
    const mw2 = async (_args: any, next: any) => next();

    const layout = t.layout("/*").use(mw1).use(mw2);

    expect(layout.kind).toBe("layout");
    expect(layout.path).toBe("/*");
    expect(layout.middlewares).toHaveLength(2);
    expect(layout.middlewares[0]).toEqual({ kind: "middleware", handler: mw1 });
    expect(layout.middlewares[1]).toEqual({ kind: "middleware", handler: mw2 });
  });

  it("builds a pathless layout with t.layout(path)", () => {
    const layout = t.layout("/_auth/*");
    expect(layout.kind).toBe("layout");
    expect(layout.path).toBe("/_auth/*");
    expect(layout.middlewares).toEqual([]);
  });

  it("infers default string params and _splat on routes and layouts", () => {
    const routeWithParams = t.get("/users/:id/posts/:postId").handler(({ req }) => {
      // Type assertion compile check
      const _id: string = req.params.id;
      const _postId: string = req.params.postId;
      return new Response(`${_id}-${_postId}`);
    });
    expect(routeWithParams.path).toBe("/users/:id/posts/:postId");

    const routeWithSplat = t.get("/files/*").handler(({ req }) => {
      const _splat: string = req.params._splat;
      return new Response(_splat);
    });
    expect(routeWithSplat.path).toBe("/files/*");

    const layoutWithSplat = t.layout("/admin/:id/*").use(async ({ req }, next) => {
      const _id: string = req.params.id;
      const _splat: string = req.params._splat;
      return next();
    });
    expect(layoutWithSplat.path).toBe("/admin/:id/*");
  });

  it("supports schema builder methods (.params, .query, .body, .returns) on route builder", () => {
    const mockSchema = {
      "~standard": {
        version: 1 as const,
        vendor: "test",
        validate: (v: unknown) => ({ value: v }),
      },
    };

    const route = t
      .post("/users/:id")
      .params(mockSchema)
      .query(mockSchema)
      .body(mockSchema, "json")
      .returns({ 200: mockSchema })
      .handler(() => new Response("ok"));

    expect(route.schemas).toBeDefined();
    expect(route.schemas?.params).toBe(mockSchema);
    expect(route.schemas?.query).toBe(mockSchema);
    expect(route.schemas?.body?.schema).toBe(mockSchema);
    expect(route.schemas?.body?.mode).toBe("json");
    expect(route.schemas?.returns?.[200]).toBe(mockSchema);
    expect(route.returns?.[200]).toBe(mockSchema);
  });

  it("builds a middleware definition with t.middleware() and schemas", () => {
    const mockSchema = {
      "~standard": {
        version: 1 as const,
        vendor: "test",
        validate: (v: unknown) => ({ value: v }),
      },
    };

    const fn = async (_args: any, next: any) => next();

    const mwDef = t
      .middleware()
      .params(mockSchema)
      .query(mockSchema)
      .body(mockSchema, "json")
      .handler(fn);

    expect(mwDef.kind).toBe("middleware");
    expect(mwDef.handler).toBe(fn);
    expect(mwDef.schemas).toBeDefined();
    expect(mwDef.schemas?.params).toBe(mockSchema);
    expect(mwDef.schemas?.query).toBe(mockSchema);
    expect(mwDef.schemas?.body?.schema).toBe(mockSchema);
  });

  it("supports shorthand t.middleware(fn)", () => {
    const fn = async (_args: any, next: any) => next();
    const mwDef = t.middleware(fn);

    expect(mwDef.kind).toBe("middleware");
    expect(mwDef.handler).toBe(fn);
    expect(mwDef.schemas).toBeUndefined();
  });

  it("registers middleware definitions via .use() on routes and layouts", () => {
    const fn = async (_args: any, next: any) => next();
    const mwDef = t.middleware(fn);

    const route = t
      .get("/test")
      .use(mwDef)
      .handler(() => new Response("ok"));
    expect(route.middlewares).toHaveLength(1);
    expect(route.middlewares?.[0]).toBe(mwDef);

    const layout = t.layout("/*").use(mwDef);
    expect(layout.middlewares).toHaveLength(1);
    expect(layout.middlewares[0]).toBe(mwDef);
  });

  it("infers phantom types (_state, _services, _params, _query, _body) on t.middleware()", () => {
    const mockSchema = <T>(val: T) => ({
      "~standard": {
        version: 1 as const,
        vendor: "test",
        validate: () => ({ value: val }),
        types: { input: val, output: val },
      },
    });

    const mw = t
      .middleware()
      .params(mockSchema({ id: 123 }))
      .query(mockSchema({ search: "hello" }))
      .body(mockSchema({ title: "post" }))
      .handler(async (_args, next) => {
        return await next.provide({ logger: 42 }, { userId: "user-1" });
      });

    // Static type assertions
    type Assert<T extends true> = T;
    type Equal<A, B> =
      (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

    type _S = Assert<Equal<NonNullable<typeof mw._services>, { logger: number }>>;
    type _St = Assert<Equal<NonNullable<typeof mw._state>, { userId: string }>>;
    type _P = Assert<Equal<NonNullable<typeof mw._params>, { id: number }>>;
    type _Q = Assert<Equal<NonNullable<typeof mw._query>, { search: string }>>;
    type _B = Assert<Equal<NonNullable<typeof mw._body>, { title: string }>>;

    expect(mw.schemas?.params).toBeDefined();
    expect(mw.schemas?.query).toBeDefined();
    expect(mw.schemas?.body?.schema).toBeDefined();
  });

  it("accumulates typed state and services sequentially across chained .use() on LayoutBuilder and RouteBuilder", () => {
    const l = t
      .layout("/*")
      .use(async (_args, next) => {
        return await next({ token: "auth-123" });
      })
      .use(async ({ state }, next) => {
        const _token: string = state.token;
        return await next.provide({ authService: { verify: () => true } }, { role: "admin" });
      })
      .use(async ({ state, authService }, next) => {
        const _token: string = state.token;
        const _role: string = state.role;
        const isValid: boolean = authService.verify();
        return await next({ verified: isValid });
      });

    type Assert<T extends true> = T;
    type Equal<A, B> =
      (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

    type _LS = Assert<
      Equal<NonNullable<typeof l._services>, { authService: { verify: () => true } }>
    >;
    type _LSt = Assert<
      Equal<NonNullable<typeof l._state>, { token: string } & { role: string } & { verified: true }>
    >;

    const r = t
      .get("/chained")
      .use(async (_args, next) => {
        return await next({ step1: 1 });
      })
      .use(async ({ state }, next) => {
        const _s1: number = state.step1;
        return await next.provide({ myService: "active" }, { step2: "two" });
      })
      .use(async ({ state, myService }, next) => {
        const _s1: number = state.step1;
        const _s2: string = state.step2;
        const _srv: string = myService;
        return await next();
      })
      .handler(({ state, myService }) => {
        const s1: number = state.step1;
        const s2: string = state.step2;
        const srv: string = myService;
        return new Response(`${s1}-${s2}-${srv}`);
      });

    expect(l.middlewares).toHaveLength(3);
    expect(r.middlewares).toHaveLength(3);
  });

  it("supports schema builder methods (.params, .query, .body) on LayoutBuilder", () => {
    const mockSchema = <T>(val: T) => ({
      "~standard": {
        version: 1 as const,
        vendor: "test",
        validate: () => ({ value: val }),
        types: { input: val, output: val },
      },
    });

    const l = t
      .layout("/admin/:id/*")
      .params(mockSchema({ id: 100 }))
      .query(mockSchema({ filter: "active" }))
      .body(mockSchema({ data: true as boolean }), "json")
      .use(async ({ req }, next) => {
        const _id: number = req.params.id;
        const _filter: string = req.query.filter;
        const _data: boolean = req.body!.data;
        return await next();
      });

    type Assert<T extends true> = T;
    type Equal<A, B> =
      (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

    type _P_id = Assert<Equal<NonNullable<typeof l._params>["id"], number>>;
    type _P_splat = Assert<Equal<NonNullable<typeof l._params>["_splat"], string>>;
    type _Q_filter = Assert<Equal<NonNullable<typeof l._query>["filter"], string>>;
    type _B_data = Assert<Equal<NonNullable<typeof l._body>["data"], boolean>>;

    expect(l.schemas).toBeDefined();
    expect(l.schemas?.params).toBeDefined();
    expect(l.schemas?.query).toBeDefined();
    expect(l.schemas?.body?.schema).toBeDefined();
    expect(l.schemas?.body?.mode).toBe("json");
  });
});

import { describe, it, expect } from "vitest";
import { t } from "../src/index.js";
import { ok, notFound } from "../src/reply.js";

declare module "../src/types.js" {
  interface RouterRegister {
    LayoutTree: {
      "/*": true;
      "/admin/*": true;
      "/admin/users/*": true;
      "/_auth/*": true;
    };
    LayoutHierarchy: {
      "/*": readonly [];
      "/admin/*": readonly ["/*"];
      "/admin/users/*": readonly ["/*", "/admin/*"];
      "/_auth/*": readonly ["/*"];
    };
    RouteByPathMethod: {
      "/admin/users": {
        GET: {
          layouts: readonly ["/*", "/admin/*", "/admin/users/*"];
        };
      };
      "/admin/settings/profile": {
        GET: {
          layouts: readonly ["/*", "/admin/*"];
        };
      };
      "/public": {
        GET: {
          layouts: readonly ["/*"];
        };
      };
      "/users/:id": {
        GET: {
          layouts: readonly ["/*"];
        };
      };
    };
  }
}

describe("Route builder (t.get, t.post, t.put, t.delete, t.patch)", () => {
  const createMockSchema = <T>(val: T) => ({
    "~standard": {
      version: 1 as const,
      vendor: "test",
      validate: () => ({ value: val }),
      types: { input: val, output: val },
    },
  });
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

  it("supports standalone validator middleware without calling .handler()", () => {
    const mockSchema = <T>(val: T) => ({
      "~standard": {
        version: 1 as const,
        vendor: "test",
        validate: () => ({ value: val }),
        types: { input: val, output: val },
      },
    });

    const mwQuery = t.middleware().query(mockSchema({ search: "keyword" }));
    const mwParams = t.middleware().params(mockSchema({ id: 123 }));
    const mwBody = t.middleware().body(mockSchema({ title: "post" }));

    expect(mwQuery.kind).toBe("middleware");
    expect(typeof mwQuery.handler).toBe("function");
    expect(mwQuery.schemas?.query).toBeDefined();

    const getRoute = t
      .get("/search")
      .use(mwQuery)
      .handler(({ req }) => {
        const _search: string = req.query.search;
        return new Response(_search);
      });

    expect(getRoute.middlewares).toHaveLength(1);
    expect(getRoute.middlewares?.[0]).toBe(mwQuery);

    const layoutDef = t.layout("/users/:id/*").use(mwParams);
    expect(layoutDef.middlewares).toHaveLength(1);
    expect(layoutDef.middlewares[0]).toBe(mwParams);

    const postRoute = t
      .post("/users")
      .use(mwBody)
      .handler(({ req }) => {
        const _title: string = req.body!.title;
        return new Response(_title);
      });

    expect(postRoute.middlewares).toHaveLength(1);
    expect(postRoute.middlewares?.[0]).toBe(mwBody);

    // Static type assertions
    type Assert<T extends true> = T;
    type Equal<A, B> =
      (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

    type _Q = Assert<Equal<NonNullable<typeof mwQuery._query>, { search: string }>>;
    type _P = Assert<Equal<NonNullable<typeof mwParams._params>, { id: number }>>;
    type _B = Assert<Equal<NonNullable<typeof mwBody._body>, { title: string }>>;
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

  it("enforces fluent ordering restricting .use() before route validations", () => {
    const mockSchema = <T>(val: T) => ({
      "~standard": {
        version: 1 as const,
        vendor: "test",
        validate: () => ({ value: val }),
        types: { input: val, output: val },
      },
    });

    const mw1 = async (_args: any, next: any) => next();
    const mw2 = async (_args: any, next: any) => next();

    // Valid chaining: zero or more .use() before validations across HTTP verbs
    const validGetRoute = t
      .get("/items/:id")
      .use(mw1)
      .use(mw2)
      .params(mockSchema({ id: "123" }))
      .query(mockSchema({ search: "test" }))
      .body(mockSchema({ count: 1 }))
      .returns({ 200: mockSchema({ ok: true }) })
      .handler(({ req }) => new Response(req.params.id));

    expect(validGetRoute.middlewares).toHaveLength(2);
    expect(validGetRoute.schemas?.params).toBeDefined();

    const validPostRoute = t
      .post("/items")
      .use(mw1)
      .body(mockSchema({ title: "hello" }))
      .handler(() => new Response("ok"));
    expect(validPostRoute.middlewares).toHaveLength(1);

    const validPutRoute = t
      .put("/items/:id")
      .use(mw1)
      .params(mockSchema({ id: "123" }))
      .handler(() => new Response("ok"));
    expect(validPutRoute.middlewares).toHaveLength(1);

    const validDeleteRoute = t
      .delete("/items/:id")
      .use(mw1)
      .params(mockSchema({ id: "123" }))
      .handler(() => new Response("ok"));
    expect(validDeleteRoute.middlewares).toHaveLength(1);

    const validPatchRoute = t
      .patch("/items/:id")
      .use(mw1)
      .params(mockSchema({ id: "123" }))
      .handler(() => new Response("ok"));
    expect(validPatchRoute.middlewares).toHaveLength(1);

    // Invalid chaining: .use() after .params()
    const builderAfterParams = t.get("/items/:id").params(mockSchema({ id: "123" }));
    // @ts-expect-error .use() must not be callable after .params()
    builderAfterParams.use(mw1);

    // Invalid chaining: .use() after .body()
    const builderAfterBody = t.post("/items").body(mockSchema({ count: 1 }));
    // @ts-expect-error .use() must not be callable after .body()
    builderAfterBody.use(mw1);

    // Invalid chaining: .use() after .query()
    const builderAfterQuery = t.get("/items").query(mockSchema({ search: "test" }));
    // @ts-expect-error .use() must not be callable after .query()
    builderAfterQuery.use(mw1);

    // Invalid chaining: .use() after .returns()
    const builderAfterReturns = t.get("/items").returns({ 200: mockSchema({ ok: true }) });
    // @ts-expect-error .use() must not be callable after .returns()
    builderAfterReturns.use(mw1);
  });

  it("constrains handler return types when .returns() is specified", () => {
    const userSchema = createMockSchema({ id: "u-1", name: "Alice" });
    const notFoundSchema = createMockSchema({ error: "not found" });

    // Valid returns matching contract with reply helpers
    const validRoute = t
      .get("/user")
      .returns({
        200: userSchema,
        404: notFoundSchema,
      })
      .handler(async () => {
        return ok({ id: "u-1", name: "Alice" });
      });
    expect(validRoute).toBeDefined();

    // Invalid returns with mismatched status code using notFound()
    t.get("/user")
      .returns({
        200: userSchema,
      })
      // @ts-expect-error Handler returning 404 response when only 200 is declared in .returns()
      .handler(async () => {
        return notFound({ error: "not found" });
      });

    // Invalid returns with mismatched data type for 200 using ok()
    t.get("/user")
      .returns({
        200: userSchema,
      })
      // @ts-expect-error Handler returning string for id instead of user object
      .handler(async () => {
        return ok({ id: 123, name: 456 });
      });
  });

  describe("Multi-method and catch-all route builders (t.all, t.any, t.query, t.options, t.head)", () => {
    it("builds t.all() catch-all route definition", () => {
      const handler = () => new Response("all-methods");
      const route = t.all("/proxy/*").handler(handler);

      expect(route.kind).toBe("route");
      expect(route.method).toBe("ALL");
      expect(route.path).toBe("/proxy/*");
      expect(route.handler).toBe(handler);
    });

    it("builds t.any() multi-method route definition with explicit HTTP verbs", () => {
      const handler = () => new Response("any-methods");
      const route = t.any("/webhook", ["GET", "post"]).handler(handler);

      expect(route.kind).toBe("route");
      expect(route.method).toBe("ANY");
      expect(route.methods).toEqual(["GET", "POST"]);
      expect(route.path).toBe("/webhook");
      expect(route.handler).toBe(handler);
    });

    it("builds t.query(), t.options(), and t.head() route definitions", () => {
      const dummyHandler = () => new Response("ok");

      const queryRoute = t.query("/search").handler(dummyHandler);
      expect(queryRoute.method).toBe("QUERY");
      expect(queryRoute.path).toBe("/search");

      const optionsRoute = t.options("/cors").handler(dummyHandler);
      expect(optionsRoute.method).toBe("OPTIONS");
      expect(optionsRoute.path).toBe("/cors");

      const headRoute = t.head("/health").handler(dummyHandler);
      expect(headRoute.method).toBe("HEAD");
      expect(headRoute.path).toBe("/health");
    });
  });

  describe("Layout-scoped middleware and compile-time branch safety", () => {
    it("supports direct handler signature middleware(layoutId, handler) and t.middleware(layoutId, handler)", () => {
      const mw1 = t.middleware("/admin/*", async (_args, next) => next());
      expect(mw1.kind).toBe("middleware");
      expect(mw1.layoutId).toBe("/admin/*");

      const mw2 = t.middleware("/_auth/*", async (_args, next) => next());
      expect(mw2.kind).toBe("middleware");
      expect(mw2.layoutId).toBe("/_auth/*");
    });

    it("statically restricts layoutId to RegisteredLayoutId (keyof LayoutTree) and rejects arbitrary strings", () => {
      // Valid: registered layout IDs
      const validMw1 = t.middleware("/admin/*", async (_args, next) => next());
      const validMw2 = t.middleware("/_auth/*");
      expect(validMw1.layoutId).toBe("/admin/*");
      expect(validMw2).toBeDefined();

      // Invalid: arbitrary string not in keyof LayoutTree
      // @ts-expect-error Arbitrary string "auth" is not in keyof LayoutTree
      t.middleware("auth", async (_args, next) => next());

      // @ts-expect-error Arbitrary string "/random/*" is not in keyof LayoutTree
      t.middleware("/random/*");
    });

    it("supports chained builder signature middleware(layoutId) and creates definitions with layoutId", () => {
      const mw = t
        .middleware("/admin/*")
        .requires<{ state?: { token: string } }>()
        .handler(async ({ state }, next) => {
          return await next({ adminChecked: true });
        });

      expect(mw.kind).toBe("middleware");
      expect(mw.layoutId).toBe("/admin/*");
    });

    it("allows mounting layout-scoped middleware on matching layout branches and route paths", () => {
      const adminMw = t.middleware("/admin/*", async (_args, next) => next());

      // Allowed on matching layout branch
      const adminLayout = t.layout("/admin/*").use(adminMw);
      expect(adminLayout.middlewares).toHaveLength(1);

      // Allowed on sub-layout branch
      const nestedAdminLayout = t.layout("/admin/users/*").use(adminMw);
      expect(nestedAdminLayout.middlewares).toHaveLength(1);

      // Allowed on matching route paths
      const adminRoute = t.get("/admin/users").use(adminMw).handler(() => new Response("ok"));
      expect(adminRoute.middlewares).toHaveLength(1);

      const adminSubRoute = t.get("/admin/settings/profile").use(adminMw).handler(() => new Response("ok"));
      expect(adminSubRoute.middlewares).toHaveLength(1);
    });

    it("statically prevents mounting layout-scoped middleware on unrelated branches", () => {
      const adminMw = t.middleware("/admin/*", async (_args, next) => next());

      // @ts-expect-error Layout-scoped middleware "/admin/*" cannot be mounted on root layout "/*"
      t.layout("/*").use(adminMw);

      // @ts-expect-error Layout-scoped middleware "/admin/*" cannot be mounted on unrelated layout "/public/*"
      t.layout("/public/*").use(adminMw);

      // @ts-expect-error Layout-scoped middleware "/admin/*" cannot be mounted on unrelated route "/public"
      t.get("/public").use(adminMw);

      // @ts-expect-error Layout-scoped middleware "/admin/*" cannot be mounted on unrelated route "/users/:id"
      t.get("/users/:id").use(adminMw);
    });
  });

  describe("Precondition requirements (.requires<{ state?, services?, params?, query?, body? }>)", () => {
    it("validates state preconditions satisfied by preceding middleware", () => {
      type User = { id: string; role: "admin" | "user" };

      const authMw = t.middleware().handler(async (_args, next) => {
        return await next({ user: { id: "u-1", role: "admin" as const } });
      });

      const requireAdmin = t
        .middleware()
        .requires<{ state: { user: User } }>()
        .handler(async ({ state }, next) => {
          const _role: "admin" | "user" = state.user.role;
          return await next({ isAdmin: true });
        });

      // Valid: authMw precedes requireAdmin and satisfies state.user
      const validRoute = t
        .get("/admin/dashboard")
        .use(authMw)
        .use(requireAdmin)
        .handler(({ state }) => {
          const _isAdmin: boolean = state.isAdmin;
          return new Response("admin");
        });
      expect(validRoute.middlewares).toHaveLength(2);

      // Invalid: requireAdmin placed without preceding authMw providing state.user
      // @ts-expect-error Missing required state: { user: User }
      t.get("/admin/dashboard").use(requireAdmin);
    });

    it("validates services preconditions satisfied by preceding middleware", () => {
      type DB = { query: () => string[] };
      const dummyDb: DB = { query: () => ["a"] };

      const dbMw = t.middleware().handler(async (_args, next) => {
        return await next.provide({ db: dummyDb });
      });

      const requireDb = t
        .middleware()
        .requires<{ services: { db: DB } }>()
        .handler(async (args, next) => {
          const _db: DB = args.db;
          return await next();
        });

      // Valid: dbMw precedes requireDb
      const validRoute = t
        .get("/data")
        .use(dbMw)
        .use(requireDb)
        .handler(({ db }) => {
          return new Response(db.query().join(","));
        });
      expect(validRoute.middlewares).toHaveLength(2);

      // Invalid: requireDb placed without preceding db service
      // @ts-expect-error Missing required services: { db: DB }
      t.get("/data").use(requireDb);
    });

    it("validates route params preconditions against route path and preceding schemas", () => {
      const requireUserId = t
        .middleware()
        .requires<{ params: { userId: string } }>()
        .handler(async ({ req }, next) => {
          const _userId: string = req.params.userId;
          return await next();
        });

      // Valid: Route path defines :userId
      const validRoute = t
        .get("/users/:userId/profile")
        .use(requireUserId)
        .handler(({ req }) => new Response(req.params.userId));
      expect(validRoute.middlewares).toHaveLength(1);

      // Invalid: Route path does not define :userId
      // @ts-expect-error Route path "/profile" has no :userId parameter
      t.get("/profile").use(requireUserId);

      // Invalid: Route path defines :id instead of :userId
      // @ts-expect-error Route path defines :id, but middleware requires :userId
      t.get("/users/:id").use(requireUserId);
    });

    it("validates preconditions on layouts", () => {
      type Tenant = { tenantId: string };

      const tenantMw = t.middleware().handler(async (_args, next) => {
        return await next({ tenant: { tenantId: "tenant-1" } });
      });

      const requireTenant = t
        .middleware()
        .requires<{ state: { tenant: Tenant } }>()
        .handler(async ({ state }, next) => {
          const _t: string = state.tenant.tenantId;
          return await next();
        });

      // Valid on layout when tenantMw precedes
      const validLayout = t.layout("/workspace/*").use(tenantMw).use(requireTenant);
      expect(validLayout.middlewares).toHaveLength(2);

      // Invalid on layout without preceding tenant
      // @ts-expect-error Layout does not satisfy state: { tenant: Tenant }
      t.layout("/workspace/*").use(requireTenant);
    });

    it("validates query preconditions against layout query schema", () => {
      const searchSchema = createMockSchema({ q: "hello", page: 1 });

      const requireSearchQuery = t
        .middleware()
        .requires<{ query: { q: string } }>()
        .handler(async ({ req }, next) => {
          const _q: string = (req.query as any).q;
          return await next();
        });

      // Valid: layout declares query schema satisfying { q: string }
      const validLayout = t
        .layout("/search/*")
        .query(searchSchema)
        .use(requireSearchQuery);
      expect(validLayout.middlewares).toHaveLength(2);

      // Invalid: layout does not define query schema
      // @ts-expect-error Layout lacks query schema satisfying { q: string }
      t.layout("/search/*").use(requireSearchQuery);
    });

    it("validates body preconditions against layout body schema", () => {
      const createItemSchema = createMockSchema({ title: "Widget", price: 100 });

      const requireBodyTitle = t
        .middleware()
        .requires<{ body: { title: string } }>()
        .handler(async ({ req }, next) => {
          return await next();
        });

      // Valid: layout declares body schema satisfying { title: string }
      const validLayout = t
        .layout("/items/*")
        .body(createItemSchema)
        .use(requireBodyTitle);
      expect(validLayout.middlewares).toHaveLength(2);

      // Invalid: layout does not define body schema
      // @ts-expect-error Layout lacks body schema satisfying { title: string }
      t.layout("/items/*").use(requireBodyTitle);
    });
  });
});

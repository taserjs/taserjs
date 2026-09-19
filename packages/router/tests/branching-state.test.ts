// oxlint-disable no-constant-condition
import { describe, it, expect, expectTypeOf } from "vitest";
import { t } from "../src/index.js";
import { unauthorized } from "../src/reply.js";

describe("Middleware branching state and services union inference", () => {
  it("merges conditional next() and next({ state }) making non-common keys optional", () => {
    const route = t
      .get("/test-branching-state")
      .use(async (_args, next) => {
        const hasUser = false;
        if (!hasUser) {
          return next();
        }
        return next({ user: { id: "123", name: "John Doe" } });
      })
      .handler(({ state }) => {
        expectTypeOf(state).toEqualTypeOf<{ user?: { id: string; name: string } }>();
        // state.user is optional on the first level: { id: string; name: string } | undefined
        if (state.user) {
          const id: string = state.user.id;
          const name: string = state.user.name;
          expect(id).toBe("123");
          expect(name).toBe("John Doe");
        }
        return new Response("ok");
      });

    expect(route).toBeDefined();
  });

  it("merges conditional next.provide({ service }) and next() making service optional", () => {
    type LoggerService = { log: (msg: string) => string };
    const route = t
      .get("/test-branching-service")
      .use(async (_args, next) => {
        const condition = true;
        if (condition) {
          return next.provide({ logger: { log: (msg: string) => msg } }, { traceId: "xyz" });
        }
        return next({ user: { id: "456" } });
      })
      .handler(({ logger, state }) => {
        expectTypeOf(logger).toEqualTypeOf<LoggerService | undefined>();
        expectTypeOf(state).toEqualTypeOf<{ traceId?: string; user?: { id: string } }>();

        // logger is optional in args: { log: (msg: string) => string } | undefined
        if (logger) {
          const res = logger.log("hello");
          expect(res).toBe("hello");
        }
        // traceId and user are optional
        const traceId: string | undefined = state.traceId;
        const user: { id: string } | undefined = state.user;
        expect(traceId).toBeDefined();
        expect(user).toBeUndefined();
        return new Response("ok");
      });

    expect(route).toBeDefined();
  });

  it("unions common keys while making divergent keys optional", () => {
    const route = t
      .get("/test-common-and-divergent")
      .use(async (_args, next) => {
        const isAdmin = true;
        if (isAdmin) {
          return next({ role: "admin" as const, permissions: ["read", "write"] });
        }
        return next({ role: "user" as const });
      })
      .handler(({ state }) => {
        expectTypeOf(state).toEqualTypeOf<{
          role: "admin" | "user";
          permissions?: string[];
        }>();

        // role is required: "admin" | "user"
        const role: "admin" | "user" = state.role;
        expect(role).toBeDefined();
        // permissions is optional: string[] | undefined
        if (state.permissions) {
          const p: string[] = state.permissions;
          expect(p).toHaveLength(2);
        }
        return new Response("ok");
      });

    expect(route).toBeDefined();
  });

  it("accumulates branching state across multiple chained .use() calls", () => {
    const route = t
      .get("/test-chained-branching")
      .use(async (_args, next) => {
        if (false) return next();
        return next({ authUser: { id: "1" } });
      })
      .use(async (_args, next) => {
        if (false) return next();
        return next({ org: { orgId: "org-1" } });
      })
      .handler(({ state }) => {
        expectTypeOf(state).toEqualTypeOf<{
          authUser?: { id: string };
          org?: { orgId: string };
        }>();

        const authUser: { id: string } | undefined = state.authUser;
        const org: { orgId: string } | undefined = state.org;
        expect(authUser).toBeUndefined();
        expect(org).toBeUndefined();
        return new Response("ok");
      });

    expect(route).toBeDefined();
  });

  it("retains guaranteed state as required when a branch aborts with an early Response", () => {
    const route = t
      .get("/test-early-response-state")
      .use(async (_args, next) => {
        const unauthorized = false;
        if (unauthorized) {
          return new Response("Unauthorized", { status: 401 });
        }
        return next({ user: { id: "123", role: "admin" } });
      })
      .handler(({ state }) => {
        expectTypeOf(state).toEqualTypeOf<{
          user: { id: string; role: string };
        }>();

        // user must be required, NOT optional:
        const id: string = state.user.id;
        const role: string = state.user.role;
        expect(id).toBe("123");
        expect(role).toBe("admin");
        return new Response("ok");
      });

    expect(route).toBeDefined();
  });

  it("allows subsequent .use() middleware to consume optional state from prior branching .use()", () => {
    const route = t
      .get("/test-subsequent-use-optional")
      .use(async (_args, next) => {
        const hasUser = false;
        if (!hasUser) return next();
        return next({ user: { id: "123" } });
      })
      .use(async ({ state }, next) => {
        expectTypeOf(state).toEqualTypeOf<{ user?: { id: string } }>();
        // state.user is typed as { id: string } | undefined
        const maybeUser: { id: string } | undefined = state.user;
        const hasAuth = Boolean(maybeUser);
        return next({ hasAuth });
      })
      .handler(({ state }) => {
        expectTypeOf(state).toEqualTypeOf<{
          user?: { id: string };
          hasAuth: boolean;
        }>();

        const hasAuth: boolean = state.hasAuth;
        const user: { id: string } | undefined = state.user;
        expect(hasAuth).toBe(false);
        expect(user).toBeUndefined();
        return new Response("ok");
      });

    expect(route).toBeDefined();
  });

  it("works with layout .use() branching state and accumulates into layout definition", () => {
    const l = t
      .layout("/admin/*")
      .use(async (_args, next) => {
        const cond = true;
        if (!cond) return next();
        return next({ adminSession: { token: "abc" } });
      })
      .use(async ({ state }, next) => {
        expectTypeOf(state).toEqualTypeOf<{ adminSession?: { token: string } }>();
        const session: { token: string } | undefined = state.adminSession;
        return next({ hasSession: Boolean(session) });
      });

    expect(l.middlewares).toHaveLength(2);

    type LayoutState = NonNullable<typeof l._state>;
    expectTypeOf<LayoutState>().toEqualTypeOf<
      { adminSession?: { token: string } } & { hasSession: boolean }
    >();
  });

  it("retains guaranteed services as required when a branch aborts with an early Response", () => {
    type AuthService = { authenticate: () => boolean };
    const route = t
      .get("/test-early-response-service")
      .use(async (_args, next) => {
        const unauthorized = false;
        if (unauthorized) {
          return new Response("Unauthorized", { status: 401 });
        }
        return next.provide({ auth: { authenticate: (): boolean => true } });
      })
      .handler(({ auth }) => {
        expectTypeOf(auth).toEqualTypeOf<AuthService>();
        return new Response("ok");
      });

    expect(route).toBeDefined();
  });

  it("retains guaranteed state when early branch returns t.reply.unauthorized() (TypedResponse)", () => {
    const route = t
      .get("/test-early-reply-state")
      .use(async (_args, next) => {
        const isUnauthorized = false;
        if (isUnauthorized) {
          return unauthorized({ message: "unauthorized" });
        }
        return next({ user: { id: "456", name: "Alice" } });
      })
      .handler(({ state }) => {
        expectTypeOf(state).toEqualTypeOf<{ user: { id: string; name: string } }>();
        return new Response("ok");
      });

    expect(route).toBeDefined();
  });

  it("handles branching next.provide vs next({ state }) where common state is retained as required and service is optional", () => {
    type Service = { name: string };
    type User = { id: string; name: string };
    const route = t
      .get("/test-provide-vs-next-state")
      .use(async (_args, next) => {
        const serviceExists = true;
        if (serviceExists) {
          return next.provide({ service: { name: "svc" } }, { user: { id: "123", name: "John" } });
        }
        return next({ user: { id: "123", name: "John" } });
      })
      .handler(({ service, state }) => {
        expectTypeOf(service).toEqualTypeOf<Service | undefined>();
        expectTypeOf(state).toEqualTypeOf<{ user: User }>();
        return new Response("ok");
      });

    expect(route).toBeDefined();
  });

  it("handles branching next.provide with divergent services and common services", () => {
    type BaseLogger = { log: (s: string) => void };
    type Metrics = { count: () => number };
    const route = t
      .get("/test-provide-branching-services")
      .use(async (_args, next) => {
        const isProd = true;
        if (isProd) {
          return next.provide({
            logger: { log: (_s: string) => {} },
            metrics: { count: (): number => 42 },
          });
        }
        return next.provide({
          logger: { log: (_s: string) => {} },
          debugMode: true,
        });
      })
      .handler(({ logger, metrics, debugMode }) => {
        expectTypeOf(logger).toEqualTypeOf<BaseLogger>();
        expectTypeOf(metrics).toEqualTypeOf<Metrics | undefined>();
        expectTypeOf(debugMode).toEqualTypeOf<boolean | undefined>();
        return new Response("ok");
      });

    expect(route).toBeDefined();
  });

  it("handles branching when next() is called with no arguments vs next.provide()", () => {
    type AuthService = { verify: () => boolean };
    const route = t
      .get("/test-pure-next-vs-provide")
      .use(async (_args, next) => {
        const shouldProvide = false;
        if (shouldProvide) {
          return next.provide({ auth: { verify: (): boolean => true } }, { user: { id: "u1" } });
        }
        return next();
      })
      .handler(({ auth, state }) => {
        expectTypeOf(auth).toEqualTypeOf<AuthService | undefined>();
        expectTypeOf(state).toEqualTypeOf<{ user?: { id: string } }>();
        return new Response("ok");
      });

    expect(route).toBeDefined();
  });

  it("works with t.middleware(fn) branching state definition", () => {
    const branchingMw = t.middleware(async (_args, next) => {
      const hasOrg = false;
      if (!hasOrg) return next();
      return next({ org: { id: "org-1" } });
    });

    const route = t
      .get("/test-middleware-def-branching")
      .use(branchingMw)
      .handler(({ state }) => {
        expectTypeOf(state).toEqualTypeOf<{ org?: { id: string } }>();
        return new Response("ok");
      });

    expect(route).toBeDefined();
  });

  it("handles branching when a branch contains optional properties (does not short-circuit MergeUnion)", () => {
    type User = { id: string; name?: string };

    const route = t
      .get("/test-optional-branch-state")
      .use(async (_args, next) => {
        const cond = true;
        if (cond) {
          const u: User = { id: "1" };
          return next({ user: u });
        }
        return next();
      })
      .handler(({ state }) => {
        expectTypeOf(state).toEqualTypeOf<{ user?: User }>();
        const u = state.user;
        expectTypeOf(u).toEqualTypeOf<User | undefined>();
        return new Response("ok");
      });

    expect(route).toBeDefined();

    const route2 = t
      .get("/test-optional-key-merge")
      .use(async (_args, next) => {
        const flag = true;
        if (flag) {
          return next({ a: "hello", b: "optional-in-branch" as string | undefined });
        }
        return next({ a: "world" });
      })
      .handler(({ state }) => {
        expectTypeOf(state).toEqualTypeOf<{ a: string; b?: string | undefined }>();
        return new Response("ok");
      });

    expect(route2).toBeDefined();
  });

  it("works identically across all route HTTP methods (post, put, patch, delete)", () => {
    const postRoute = t
      .post("/test-post-branching")
      .use(async (_args, next) => {
        const cond = false;
        if (!cond) return next();
        return next({ createdBy: "user-1" });
      })
      .handler(({ state }) => {
        expectTypeOf(state).toEqualTypeOf<{ createdBy?: string }>();
        return new Response("ok");
      });

    const putRoute = t
      .put("/test-put-branching")
      .use(async (_args, next) => {
        const cond = false;
        if (!cond) return next();
        return next.provide({ audit: { log: (_s: string) => {} } }, { updated: true });
      })
      .handler(({ audit, state }) => {
        expectTypeOf(audit).toEqualTypeOf<{ log: (s: string) => void } | undefined>();
        expectTypeOf(state).toEqualTypeOf<{ updated?: boolean }>();
        return new Response("ok");
      });

    const patchRoute = t
      .patch("/test-patch-branching")
      .use(async (_args, next) => {
        const cond = false;
        if (!cond) return next();
        return next({ patched: true });
      })
      .handler(({ state }) => {
        expectTypeOf(state).toEqualTypeOf<{ patched?: boolean }>();
        return new Response("ok");
      });

    const deleteRoute = t
      .delete("/test-delete-branching")
      .use(async (_args, next) => {
        const cond = false;
        if (!cond) return next();
        return next({ deletedId: "del-123" });
      })
      .handler(({ state }) => {
        expectTypeOf(state).toEqualTypeOf<{ deletedId?: string }>();
        return new Response("ok");
      });

    expect(postRoute).toBeDefined();
    expect(putRoute).toBeDefined();
    expect(patchRoute).toBeDefined();
    expect(deleteRoute).toBeDefined();
  });
});

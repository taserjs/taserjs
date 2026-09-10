import { bench, describe } from "vitest";
import { Hono } from "hono";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { createContext, defineTaser, t, type StandardSchemaV1 } from "@taserjs/router";
import { cookie } from "@taserjs/router/cookie";
import { json } from "@taserjs/utils";
import { createTaserApp } from "../src/index.js";
import type { RouteManifest } from "../src/types.js";

// ============================================================================
// Helpers & Standard Schemas
// ============================================================================

function createStandardSchema<TInput, TOutput = TInput>(
  validateFn: (
    value: unknown,
  ) => { value: TOutput } | { issues: Array<{ message: string; path?: Array<string | number> }> },
): StandardSchemaV1<TInput, TOutput> {
  return {
    "~standard": {
      version: 1,
      vendor: "bench",
      validate(value: unknown) {
        return validateFn(value);
      },
    },
  };
}

async function validateSchemaHelper<TOutput>(
  schema: StandardSchemaV1<unknown, TOutput>,
  value: unknown,
): Promise<{ value: TOutput } | { issues: readonly StandardSchemaV1.Issue[] }> {
  let result = schema["~standard"].validate(value);
  if (result instanceof Promise) {
    result = await result;
  }
  if (result.issues) {
    return { issues: result.issues };
  }
  return { value: result.value };
}

function createHonoValidatorMiddleware<TOutput>(
  schema: StandardSchemaV1<unknown, TOutput>,
  extractFn: (c: Context) => unknown | Promise<unknown>,
  storageKey: string,
) {
  return async (c: Context<{ Variables: Record<string, any> }>, next: any) => {
    const raw = await extractFn(c);
    const result = await validateSchemaHelper(schema, raw);
    if ("issues" in result) {
      return c.json({ errors: result.issues }, 422);
    }
    c.set(storageKey, result.value);
    await next();
  };
}

interface PersonBody {
  name: string;
  age: number;
}

const personBodySchema = createStandardSchema<PersonBody>((val: unknown) => {
  if (typeof val !== "object" || val === null) {
    return { issues: [{ message: "Expected object" }] };
  }
  const record = val as Record<string, unknown>;
  if (typeof record.name !== "string" || typeof record.age !== "number") {
    return {
      issues: [
        {
          message: "Invalid name or age",
          path: typeof record.name !== "string" ? ["name"] : ["age"],
        },
      ],
    };
  }
  return { value: { name: record.name, age: record.age } };
});

interface DynamicParams {
  id: string;
  postId: string;
}

interface CoercedParams {
  id: number;
  postId: number;
}

const paramsCoerceSchema = createStandardSchema<DynamicParams, CoercedParams>((val: unknown) => {
  if (typeof val !== "object" || val === null) {
    return { issues: [{ message: "Expected object", path: [] }] };
  }
  const record = val as Record<string, unknown>;
  const idNum = Number(record.id);
  const postNum = Number(record.postId);
  if (isNaN(idNum) || isNaN(postNum)) {
    return {
      issues: [{ message: "Invalid ID", path: isNaN(idNum) ? ["id"] : ["postId"] }],
    };
  }
  return { value: { id: idNum, postId: postNum } };
});

interface QueryParams {
  q?: string | string[];
  limit?: string | string[];
  page?: string | string[];
}

interface CoercedQueryParams {
  q: string;
  limit: number;
  page: number;
}

const queryCoerceSchema = createStandardSchema<QueryParams, CoercedQueryParams>((val: unknown) => {
  if (typeof val !== "object" || val === null) {
    return { issues: [{ message: "Expected object", path: [] }] };
  }
  const record = val as Record<string, unknown>;
  const qStr = String(record.q ?? "");
  const limitNum = Number(record.limit ?? 10);
  const pageNum = Number(record.page ?? 1);
  if (isNaN(limitNum) || isNaN(pageNum)) {
    return {
      issues: [{ message: "Invalid query param", path: isNaN(limitNum) ? ["limit"] : ["page"] }],
    };
  }
  return { value: { q: qStr, limit: limitNum, page: pageNum } };
});

// ============================================================================
// Scenario 1: Plain Route (GET /plain)
// ============================================================================

const plainTaserApp = createTaserApp({
  routes: {
    "/plain": {
      GET: {
        route: t.get("/plain").handler(() => json({ message: "ok" })),
      },
    },
  },
});

const plainHonoApp = new Hono();
plainHonoApp.get("/plain", (c) => c.json({ message: "ok" }));

describe("1. Plain Route (Baseline GET)", () => {
  bench("Taser: plain route", async () => {
    await plainTaserApp.request("/plain");
  });

  bench("Hono: plain route", async () => {
    await plainHonoApp.request("/plain");
  });
});

// ============================================================================
// Scenario 2: Route Middleware (GET /route-mw)
// ============================================================================

const routeMw = t.middleware(async (_args, next) => {
  return await next();
});

const routeMwTaserApp = createTaserApp({
  routes: {
    "/route-mw": {
      GET: {
        route: t
          .get("/route-mw")
          .use(routeMw)
          .handler(() => json({ message: "ok" })),
      },
    },
  },
});

const routeMwHonoApp = new Hono();
routeMwHonoApp.get(
  "/route-mw",
  async (_c, next) => {
    await next();
  },
  (c) => c.json({ message: "ok" }),
);

describe("2. Route Middleware (1 inline middleware)", () => {
  bench("Taser: 1 route middleware", async () => {
    await routeMwTaserApp.request("/route-mw");
  });

  bench("Hono: 1 route middleware", async () => {
    await routeMwHonoApp.request("/route-mw");
  });
});

// ============================================================================
// Scenario 3: Layout Middleware with State (GET /layout-state/profile)
// ============================================================================

const layoutStateMw = t.middleware(async ({ state }: any, next) => {
  state.user = { id: 1, role: "admin" };
  return await next();
});

const layoutStateTaserApp = createTaserApp({
  layouts: {
    "/layout-state": {
      middlewares: [layoutStateMw],
    },
  },
  routes: {
    "/layout-state/profile": {
      GET: {
        route: t
          .get("/layout-state/profile")
          .handler(({ state }: any) => json({ user: state.user })),
        layouts: ["/layout-state"],
      },
    },
  },
} as unknown as RouteManifest);

const layoutStateHonoApp = new Hono<{ Variables: Record<string, any> }>();
layoutStateHonoApp.use("/layout-state/*", async (c, next) => {
  c.set("user", { id: 1, role: "admin" });
  await next();
});
layoutStateHonoApp.get("/layout-state/profile", (c) => c.json({ user: c.get("user") }));

describe("3. Layout Middleware with State", () => {
  bench("Taser: 1 layout middleware with state", async () => {
    await layoutStateTaserApp.request("/layout-state/profile");
  });

  bench("Hono: 1 layout middleware with state", async () => {
    await layoutStateHonoApp.request("/layout-state/profile");
  });
});

// ============================================================================
// Scenario 4: Composed Layout + Route Middleware (GET /composed/item)
// ============================================================================

const composedLayoutMw = t.middleware(async ({ state }: any, next) => {
  state.user = { id: 42 };
  return await next();
});

const composedRouteMw = t.middleware(async ({ state }: any, next) => {
  state.reqId = "req-bench-123";
  return await next();
});

const composedTaserApp = createTaserApp({
  layouts: {
    "/composed": {
      middlewares: [composedLayoutMw],
    },
  },
  routes: {
    "/composed/item": {
      GET: {
        route: t
          .get("/composed/item")
          .use(composedRouteMw)
          .handler(({ state }: any) => json({ user: state.user, reqId: state.reqId })),
        layouts: ["/composed"],
      },
    },
  },
} as unknown as RouteManifest);

const composedHonoApp = new Hono<{ Variables: Record<string, any> }>();
composedHonoApp.use("/composed/*", async (c, next) => {
  c.set("user", { id: 42 });
  await next();
});
composedHonoApp.get(
  "/composed/item",
  async (c, next) => {
    c.set("reqId", "req-bench-123");
    await next();
  },
  (c) => c.json({ user: c.get("user"), reqId: c.get("reqId") }),
);

describe("4. Composed Layout + Route Middleware", () => {
  bench("Taser: 1 layout + 1 route middleware", async () => {
    await composedTaserApp.request("/composed/item");
  });

  bench("Hono: 1 layout + 1 route middleware", async () => {
    await composedHonoApp.request("/composed/item");
  });
});

// ============================================================================
// Scenario 5: Layout Middleware with State & Dynamic Service (GET /service/calc)
// ============================================================================

const mockCalcService = {
  compute: (a: number, b: number) => a + b,
};

const serviceLayoutMw = t.middleware(async ({ state }: any, next) => {
  state.user = { id: 100 };
  return await next.provide({ calcService: mockCalcService });
});

const serviceTaserApp = createTaserApp({
  layouts: {
    "/service": {
      middlewares: [serviceLayoutMw],
    },
  },
  routes: {
    "/service/calc": {
      GET: {
        route: t.get("/service/calc").handler(({ state, calcService }: any) => {
          const sum = calcService.compute(10, 20);
          return json({ userId: state.user.id, sum });
        }),
        layouts: ["/service"],
      },
    },
  },
} as unknown as RouteManifest);

const serviceHonoApp = new Hono<{ Variables: Record<string, any> }>();
serviceHonoApp.use("/service/*", async (c, next) => {
  c.set("user", { id: 100 });
  c.set("calcService", mockCalcService);
  await next();
});
serviceHonoApp.get("/service/calc", (c) => {
  const user = c.get("user");
  const calc = c.get("calcService");
  const sum = calc.compute(10, 20);
  return c.json({ userId: user.id, sum });
});

describe("5. Layout Middleware with State & Dynamic Service", () => {
  bench("Taser: layout state + dynamic service", async () => {
    await serviceTaserApp.request("/service/calc");
  });

  bench("Hono: layout state + dynamic service", async () => {
    await serviceHonoApp.request("/service/calc");
  });
});

// ============================================================================
// Scenario 6: Body Parsing & Schema Validation (POST /body/validate)
// ============================================================================

const bodyTaserApp = createTaserApp({
  routes: {
    "/body/validate": {
      POST: {
        route: t
          .post("/body/validate")
          .body(personBodySchema)
          .handler(({ req }) => json({ received: req.body })),
      },
    },
  },
});

const bodyHonoApp = new Hono<{ Variables: Record<string, any> }>();
bodyHonoApp.post(
  "/body/validate",
  createHonoValidatorMiddleware(personBodySchema, (c) => c.req.json(), "validatedBody"),
  (c) => c.json({ received: c.get("validatedBody") }),
);

const validJsonPayload = JSON.stringify({ name: "Alice", age: 30 });
const postHeaders = { "content-type": "application/json" };

describe("6. Body Parsing & Schema Validation", () => {
  bench("Taser: POST JSON with Standard Schema validation", async () => {
    await bodyTaserApp.request("/body/validate", {
      method: "POST",
      headers: postHeaders,
      body: validJsonPayload,
    });
  });

  bench("Hono: POST JSON with equivalent validation middleware", async () => {
    await bodyHonoApp.request("/body/validate", {
      method: "POST",
      headers: postHeaders,
      body: validJsonPayload,
    });
  });
});

// ============================================================================
// Scenario 7: Context Resolution Overhead (GET /context/data)
// ============================================================================

const taserContextDef = defineTaser().context(
  createContext({
    boot: async () => ({ env: "production", version: "1.0.0" }),
    request: async () => ({ requestId: "req-bench-999" }),
  }),
);

const contextTaserApp = createTaserApp(
  {
    routes: {
      "/context/data": {
        GET: {
          route: t.get("/context/data").handler(({ ctx }: any) => {
            return json({ version: ctx.version, requestId: ctx.requestId });
          }),
        },
      },
    },
  },
  taserContextDef,
);

const honoBootData = { env: "production", version: "1.0.0" };
const contextHonoApp = new Hono<{ Variables: Record<string, any> }>();
contextHonoApp.use("*", async (c, next) => {
  c.set("boot", honoBootData);
  c.set("requestId", "req-bench-999");
  await next();
});
contextHonoApp.get("/context/data", (c) => {
  const boot = c.get("boot") as typeof honoBootData;
  return c.json({ version: boot.version, requestId: c.get("requestId") });
});

describe("7. Context Resolution Overhead (boot + request context)", () => {
  bench("Taser: createContext resolution", async () => {
    await contextTaserApp.request("/context/data");
  });

  bench("Hono: middleware context assignment", async () => {
    await contextHonoApp.request("/context/data");
  });
});

// ============================================================================
// Scenario 8: Dynamic Route Parameter Extraction
// ============================================================================

const dynamicTaserApp = createTaserApp({
  routes: {
    "/users/:id/posts/:postId": {
      GET: {
        route: t.get("/users/:id/posts/:postId").handler(({ req }) => {
          return json({ id: req.params.id, postId: req.params.postId });
        }),
      },
    },
    "/users/:id/posts/:postId/coerced": {
      GET: {
        route: t
          .get("/users/:id/posts/:postId/coerced")
          .params(paramsCoerceSchema)
          .handler(({ req }) => {
            return json({ id: req.params.id, postId: req.params.postId });
          }),
      },
    },
  },
});

const dynamicHonoApp = new Hono<{ Variables: Record<string, any> }>();
dynamicHonoApp.get("/users/:id/posts/:postId", (c) => {
  return c.json({ id: c.req.param("id"), postId: c.req.param("postId") });
});
dynamicHonoApp.get(
  "/users/:id/posts/:postId/coerced",
  createHonoValidatorMiddleware(paramsCoerceSchema, (c) => c.req.param(), "params"),
  (c) => {
    const params = c.get("params") as CoercedParams;
    return c.json({ id: params.id, postId: params.postId });
  },
);

describe("8. Dynamic Route Parameter Extraction", () => {
  bench("Taser: params extraction (no schema)", async () => {
    await dynamicTaserApp.request("/users/42/posts/108");
  });

  bench("Hono: params extraction (no schema)", async () => {
    await dynamicHonoApp.request("/users/42/posts/108");
  });

  bench("Taser: params extraction + schema coercion", async () => {
    await dynamicTaserApp.request("/users/42/posts/108/coerced");
  });

  bench("Hono: params extraction + schema coercion", async () => {
    await dynamicHonoApp.request("/users/42/posts/108/coerced");
  });
});

// ============================================================================
// Scenario 9: Query Parameter Extraction & Coercion
// ============================================================================

const queryTaserApp = createTaserApp({
  routes: {
    "/search": {
      GET: {
        route: t.get("/search").handler(({ req }) => {
          return json({ q: req.query.q, limit: req.query.limit, page: req.query.page });
        }),
      },
    },
    "/search/coerced": {
      GET: {
        route: t
          .get("/search/coerced")
          .query(queryCoerceSchema)
          .handler(({ req }) => {
            return json({ q: req.query.q, limit: req.query.limit, page: req.query.page });
          }),
      },
    },
  },
});

const queryHonoApp = new Hono<{ Variables: Record<string, any> }>();
queryHonoApp.get("/search", (c) => {
  return c.json({ q: c.req.query("q"), limit: c.req.query("limit"), page: c.req.query("page") });
});
queryHonoApp.get(
  "/search/coerced",
  createHonoValidatorMiddleware(queryCoerceSchema, (c) => c.req.query(), "query"),
  (c) => {
    const q = c.get("query") as CoercedQueryParams;
    return c.json({ q: q.q, limit: q.limit, page: q.page });
  },
);

const searchUrl = "/search?q=performance&limit=25&page=2";
const searchCoercedUrl = "/search/coerced?q=performance&limit=25&page=2";

describe("9. Query Parameter Extraction & Coercion", () => {
  bench("Taser: query extraction (no schema)", async () => {
    await queryTaserApp.request(searchUrl);
  });

  bench("Hono: query extraction (no schema)", async () => {
    await queryHonoApp.request(searchUrl);
  });

  bench("Taser: query extraction + schema coercion", async () => {
    await queryTaserApp.request(searchCoercedUrl);
  });

  bench("Hono: query extraction + schema coercion", async () => {
    await queryHonoApp.request(searchCoercedUrl);
  });
});

// ============================================================================
// Scenario 10: Cookie Middleware & Flushing Lifecycle
// ============================================================================

const cookieLayoutMw = cookie();

const cookieTaserApp = createTaserApp({
  layouts: {
    "/cookies": {
      middlewares: [cookieLayoutMw],
    },
  },
  routes: {
    "/cookies/session": {
      GET: {
        route: t.get("/cookies/session").handler(({ cookies }: any) => {
          const user = cookies.get("session_user");
          cookies.set("visited", "true", { path: "/" });
          cookies.set("theme", "dark", { path: "/" });
          return json({ user });
        }),
        layouts: ["/cookies"],
      },
    },
  },
} as unknown as RouteManifest);

const cookieHonoApp = new Hono();
cookieHonoApp.get("/cookies/session", (c: Context) => {
  const user = getCookie(c, "session_user");
  setCookie(c, "visited", "true", { path: "/" });
  setCookie(c, "theme", "dark", { path: "/" });
  return c.json({ user });
});

const cookieReqHeaders = {
  Cookie: "session_user=alice_bench; theme=light",
};

describe("10. Cookie Middleware & Flushing Lifecycle", () => {
  bench("Taser: TaserCookieJar read + buffered flush on unwinding", async () => {
    await cookieTaserApp.request("/cookies/session", {
      headers: cookieReqHeaders,
    });
  });

  bench("Hono: direct getCookie + setCookie", async () => {
    await cookieHonoApp.request("/cookies/session", {
      headers: cookieReqHeaders,
    });
  });
});

// ============================================================================
// Scenario 11: Validation Error Fast Path (422 Rejection)
// ============================================================================

const invalidPayload = JSON.stringify({ name: 12345, age: "not-a-number" });

describe("11. Validation Error Fast Path (422 Rejection)", () => {
  bench("Taser: 422 early rejection on invalid body", async () => {
    await bodyTaserApp.request("/body/validate", {
      method: "POST",
      headers: postHeaders,
      body: invalidPayload,
    });
  });

  bench("Hono: 422 early rejection on invalid body", async () => {
    await bodyHonoApp.request("/body/validate", {
      method: "POST",
      headers: postHeaders,
      body: invalidPayload,
    });
  });
});

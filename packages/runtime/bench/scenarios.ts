import { createContext, defineTaser, t, type StandardSchemaV1 } from "@taserjs/router";
import { cookie } from "@taserjs/router/middleware/cookie";
import { json } from "@taserjs/utils";
import { Hono } from "hono";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";

import type { createTaserApp as CreateTaserAppFn } from "../src/index.ts";
import type { RouteManifest } from "../src/types.ts";

export type CreateTaserApp = typeof CreateTaserAppFn;

type CaseRunner = () => Response | Promise<Response>;
type Fetchable = { fetch: (request: Request) => Response | Promise<Response> };

/**
 * A Taser/Hono pair that performs the same observable work.
 * Both runners must resolve to `expectedStatus`; the harnesses verify this before measuring so a
 * regression into an error page can never masquerade as a speed-up.
 */
export interface BenchCase {
  group: string;
  name: string;
  expectedStatus: number;
  taser: CaseRunner;
  hono: CaseRunner;
}

const BASE_URL = "http://localhost";
const JSON_HEADERS = { "content-type": "application/json" };

// ============================================================================
// Request builders
// ============================================================================

/**
 * Bodyless requests are built once. Per-iteration `Request` construction is the same undici cost
 * for both frameworks (roughly 60 to 70% of CPU samples) and only compresses relative differences.
 */
function prebuiltGet(app: Fetchable, path: string, headers?: Record<string, string>): CaseRunner {
  const request = new Request(`${BASE_URL}${path}`, headers ? { headers } : undefined);
  return () => app.fetch(request);
}

/** Request bodies are single-use streams, so these are rebuilt on every call. */
function freshJsonPost(app: Fetchable, path: string, payload: string): CaseRunner {
  const url = `${BASE_URL}${path}`;
  return () =>
    app.fetch(new Request(url, { method: "POST", headers: JSON_HEADERS, body: payload }));
}

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

const validJsonPayload = JSON.stringify({ name: "Alice", age: 30 });
const invalidJsonPayload = JSON.stringify({ name: 12345, age: "not-a-number" });

// ============================================================================
// Scenarios
// ============================================================================

export function createBenchCases(createTaserApp: CreateTaserApp): BenchCase[] {
  const cases: BenchCase[] = [];

  // --------------------------------------------------------------------------
  // 1. Plain route
  // --------------------------------------------------------------------------
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

  cases.push({
    group: "1. Plain Route (Baseline GET)",
    name: "plain route",
    expectedStatus: 200,
    taser: prebuiltGet(plainTaserApp, "/plain"),
    hono: prebuiltGet(plainHonoApp, "/plain"),
  });

  // --------------------------------------------------------------------------
  // 2. Route middleware
  // --------------------------------------------------------------------------
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

  cases.push({
    group: "2. Route Middleware (1 inline middleware)",
    name: "1 route middleware",
    expectedStatus: 200,
    taser: prebuiltGet(routeMwTaserApp, "/route-mw"),
    hono: prebuiltGet(routeMwHonoApp, "/route-mw"),
  });

  // --------------------------------------------------------------------------
  // 3. Layout middleware with state
  // --------------------------------------------------------------------------
  const layoutStateMw = t.middleware(async (_args: any, next) => {
    return await next({ user: { id: 1, role: "admin" } });
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

  cases.push({
    group: "3. Layout Middleware with State",
    name: "1 layout middleware with state",
    expectedStatus: 200,
    taser: prebuiltGet(layoutStateTaserApp, "/layout-state/profile"),
    hono: prebuiltGet(layoutStateHonoApp, "/layout-state/profile"),
  });

  // --------------------------------------------------------------------------
  // 4. Composed layout + route middleware
  // --------------------------------------------------------------------------
  const composedLayoutMw = t.middleware(async (_args: any, next) => {
    return await next({ user: { id: 42 } });
  });

  const composedRouteMw = t.middleware(async (_args: any, next) => {
    return await next({ reqId: "req-bench-123" });
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

  cases.push({
    group: "4. Composed Layout + Route Middleware",
    name: "1 layout + 1 route middleware",
    expectedStatus: 200,
    taser: prebuiltGet(composedTaserApp, "/composed/item"),
    hono: prebuiltGet(composedHonoApp, "/composed/item"),
  });

  // --------------------------------------------------------------------------
  // 5. Layout middleware with state and a dynamic service
  // --------------------------------------------------------------------------
  const mockCalcService = {
    compute: (a: number, b: number) => a + b,
  };

  const serviceLayoutMw = t.middleware(async (_args: any, next) => {
    return await next.provide({ calcService: mockCalcService }, { user: { id: 100 } });
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

  cases.push({
    group: "5. Layout Middleware with State & Dynamic Service",
    name: "layout state + dynamic service",
    expectedStatus: 200,
    taser: prebuiltGet(serviceTaserApp, "/service/calc"),
    hono: prebuiltGet(serviceHonoApp, "/service/calc"),
  });

  // --------------------------------------------------------------------------
  // 6 and 11. Body parsing, schema validation and the 422 rejection path
  // --------------------------------------------------------------------------
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

  cases.push({
    group: "6. Body Parsing & Schema Validation",
    name: "POST JSON with Standard Schema validation",
    expectedStatus: 200,
    taser: freshJsonPost(bodyTaserApp, "/body/validate", validJsonPayload),
    hono: freshJsonPost(bodyHonoApp, "/body/validate", validJsonPayload),
  });

  cases.push({
    group: "11. Validation Error Fast Path (422 Rejection)",
    name: "422 early rejection on invalid body",
    expectedStatus: 422,
    taser: freshJsonPost(bodyTaserApp, "/body/validate", invalidJsonPayload),
    hono: freshJsonPost(bodyHonoApp, "/body/validate", invalidJsonPayload),
  });

  // --------------------------------------------------------------------------
  // 7. Context resolution (boot + request context)
  // --------------------------------------------------------------------------
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

  cases.push({
    group: "7. Context Resolution Overhead (boot + request context)",
    name: "createContext resolution",
    expectedStatus: 200,
    taser: prebuiltGet(contextTaserApp, "/context/data"),
    hono: prebuiltGet(contextHonoApp, "/context/data"),
  });

  // --------------------------------------------------------------------------
  // 8. Dynamic route parameters
  // --------------------------------------------------------------------------
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

  cases.push(
    {
      group: "8. Dynamic Route Parameter Extraction",
      name: "params extraction (no schema)",
      expectedStatus: 200,
      taser: prebuiltGet(dynamicTaserApp, "/users/42/posts/108"),
      hono: prebuiltGet(dynamicHonoApp, "/users/42/posts/108"),
    },
    {
      group: "8. Dynamic Route Parameter Extraction",
      name: "params extraction + schema coercion",
      expectedStatus: 200,
      taser: prebuiltGet(dynamicTaserApp, "/users/42/posts/108/coerced"),
      hono: prebuiltGet(dynamicHonoApp, "/users/42/posts/108/coerced"),
    },
  );

  // --------------------------------------------------------------------------
  // 9. Query parameters
  // --------------------------------------------------------------------------
  const queryTaserApp = createTaserApp({
    routes: {
      "/search": {
        GET: {
          route: t.get("/search").handler(({ req }) => {
            const q = (req.query as Record<string, unknown>).q;
            const limit = (req.query as Record<string, unknown>).limit;
            const page = (req.query as Record<string, unknown>).page;
            return json({ q, limit, page });
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
    return c.json({
      q: c.req.query("q"),
      limit: c.req.query("limit"),
      page: c.req.query("page"),
    });
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

  cases.push(
    {
      group: "9. Query Parameter Extraction & Coercion",
      name: "query extraction (no schema)",
      expectedStatus: 200,
      taser: prebuiltGet(queryTaserApp, searchUrl),
      hono: prebuiltGet(queryHonoApp, searchUrl),
    },
    {
      group: "9. Query Parameter Extraction & Coercion",
      name: "query extraction + schema coercion",
      expectedStatus: 200,
      taser: prebuiltGet(queryTaserApp, searchCoercedUrl),
      hono: prebuiltGet(queryHonoApp, searchCoercedUrl),
    },
  );

  // --------------------------------------------------------------------------
  // 10. Cookie middleware
  // --------------------------------------------------------------------------
  const cookieTaserApp = createTaserApp({
    layouts: {
      "/cookies": {
        middlewares: [cookie()],
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

  const cookieRequestHeaders = { Cookie: "session_user=alice_bench; theme=light" };

  cases.push({
    group: "10. Cookie Middleware & Flushing Lifecycle",
    name: "cookie read + 2 Set-Cookie writes",
    expectedStatus: 200,
    taser: prebuiltGet(cookieTaserApp, "/cookies/session", cookieRequestHeaders),
    hono: prebuiltGet(cookieHonoApp, "/cookies/session", cookieRequestHeaders),
  });

  return cases;
}

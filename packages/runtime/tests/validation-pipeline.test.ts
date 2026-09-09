import type { StandardSchemaV1 } from "@taserjs/router";
import { describe, expect, it } from "vitest";
import { t } from "@taserjs/router";
import { createTaserApp } from "../src/index.js";

// Helper to create a Standard Schema
function createNumberCoerceSchema(key: string): StandardSchemaV1<unknown, Record<string, any>> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate(value: unknown) {
        if (typeof value !== "object" || value === null) {
          return { issues: [{ message: "Expected object", path: [key] }] };
        }
        const record = value as Record<string, unknown>;
        const raw = record[key];
        const num = Number(raw);
        if (isNaN(num)) {
          return {
            issues: [
              {
                message: `Expected valid number for ${key}`,
                path: [key],
              },
            ],
          };
        }
        return {
          value: { ...record, [key]: num },
        };
      },
    },
  };
}

function createStringSchema(key: string): StandardSchemaV1<unknown, Record<string, any>> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate(value: unknown) {
        if (typeof value !== "object" || value === null) {
          return { issues: [{ message: "Expected object", path: [key] }] };
        }
        const record = value as Record<string, unknown>;
        // Purposely return an object with ONLY this key to simulate schemas stripping unknown keys
        return {
          value: { [key]: String(record[key] ?? "") },
        };
      },
    },
  };
}

describe("Standard Schema Bidirectional Validation Pipeline", () => {
  it("coerces params and mutates req.params in-place", async () => {
    let capturedParams: unknown;

    const route = t
      .get("/users/:id")
      .params(createNumberCoerceSchema("id"))
      .handler(({ req }) => {
        capturedParams = req.params;
        return Response.json({ id: req.params.id });
      });

    const app = createTaserApp({
      routes: {
        "/users/:id": {
          GET: { route },
        },
      },
    });

    const res = await app.request("http://localhost/users/123");
    expect(res.status).toBe(200);
    expect(capturedParams).toEqual({ id: 123 });
    const data = await res.json();
    expect(data).toEqual({ id: 123 });
  });

  it("coerces query and mutates req.query in-place", async () => {
    let capturedQuery: unknown;

    const route = t
      .get("/items")
      .query(createNumberCoerceSchema("page"))
      .handler(({ req }) => {
        capturedQuery = req.query;
        return Response.json({ page: req.query.page });
      });

    const app = createTaserApp({
      routes: {
        "/items": {
          GET: { route },
        },
      },
    });

    const res = await app.request("http://localhost/items?page=5");
    expect(res.status).toBe(200);
    expect(capturedQuery).toEqual({ page: 5 });
    const data = await res.json();
    expect(data).toEqual({ page: 5 });
  });

  it("extracts and validates json body, mutating req.body in-place", async () => {
    let capturedBody: unknown;

    const route = t
      .post("/items")
      .body(createNumberCoerceSchema("count"), "json")
      .handler(({ req }) => {
        capturedBody = req.body;
        return Response.json({ count: (req.body as any).count });
      });

    const app = createTaserApp({
      routes: {
        "/items": {
          POST: { route },
        },
      },
    });

    const res = await app.request("http://localhost/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ count: "42" }),
    });

    expect(res.status).toBe(200);
    expect(capturedBody).toEqual({ count: 42 });
  });

  it("formats unhandled ValidationError into HTTP 422 { errors: issues }", async () => {
    const route = t
      .get("/users/:id")
      .params(createNumberCoerceSchema("id"))
      .handler(() => Response.json({ ok: true }));

    const app = createTaserApp({
      routes: {
        "/users/:id": {
          GET: { route },
        },
      },
    });

    const res = await app.request("http://localhost/users/not-a-number");
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body).toHaveProperty("errors");
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors[0].message).toBe("Expected valid number for id");
    expect(body.errors[0].path).toEqual(["id"]);
  });

  it("enforces 415 unsupportedMediaType rejection when Content-Type mismatches declared bodyMode", async () => {
    const route = t
      .post("/upload")
      .body(createNumberCoerceSchema("count"), "json")
      .handler(() => Response.json({ ok: true }));

    const app = createTaserApp({
      routes: {
        "/upload": {
          POST: { route },
        },
      },
    });

    const res = await app.request("http://localhost/upload", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "not json",
    });

    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body).toHaveProperty("message");
    expect(body.message).toContain("Unsupported Media Type");
  });

  it("extracts and validates urlencoded body via createTaserApp", async () => {
    let capturedBody: unknown;

    const urlencodedSchema = createNumberCoerceSchema("amount");

    const route = t
      .post("/payment")
      .body(urlencodedSchema, "urlencoded")
      .handler(({ req }) => {
        capturedBody = req.body;
        return Response.json(req.body);
      });

    const app = createTaserApp({
      routes: {
        "/payment": {
          POST: { route },
        },
      },
    });

    const res = await app.request("http://localhost/payment", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "amount=99",
    });

    expect(res.status).toBe(200);
    expect(capturedBody).toEqual({ amount: 99 });
  });

  it("validates schemas declared on t.middleware() before its logic runs", async () => {
    let mwExecuted = false;

    const stepperMw = t
      .middleware()
      .query(createNumberCoerceSchema("step"))
      .handler(async ({ req }, next) => {
        expect(req.query.step).toBe(3);
        mwExecuted = true;
        return await next();
      });

    const route = t
      .get("/stepper")
      .use(stepperMw)
      .handler(({ req }) => Response.json({ step: req.query.step }));

    const app = createTaserApp({
      routes: {
        "/stepper": {
          GET: { route },
        },
      },
    });

    const res = await app.request("http://localhost/stepper?step=3");
    expect(res.status).toBe(200);
    expect(mwExecuted).toBe(true);
    const data = await res.json();
    expect(data.step).toBe(3);

    const failRes = await app.request("http://localhost/stepper?step=invalid");
    expect(failRes.status).toBe(422);
  });

  it("executes layout middlewares with schemas before downstream route handler", async () => {
    let layoutValidated = false;

    const queryMw = t
      .middleware()
      .query(createNumberCoerceSchema("limit"))
      .handler(async ({ req }, next) => {
        expect(req.query.limit).toBe(10);
        layoutValidated = true;
        return await next();
      });

    const layout = t.layout("/*").use(queryMw);

    const route = t.get("/test").handler(({ req }) => {
      return Response.json({ limit: req.query.limit });
    });

    const app = createTaserApp({
      layouts: {
        "/*": layout,
      },
      routes: {
        "/test": {
          GET: {
            layouts: ["/*"],
            route,
          },
        },
      },
    });

    const res = await app.request("http://localhost/test?limit=10");
    expect(res.status).toBe(200);
    expect(layoutValidated).toBe(true);
    const data = await res.json();
    expect(data.limit).toBe(10);

    const failRes = await app.request("http://localhost/test?limit=invalid");
    expect(failRes.status).toBe(422);
  });

  it("preserves non-validated keys across layout and handler schema validation", async () => {
    // Layout validates query 'token'
    const tokenSchema = createStringSchema("token");
    const layoutMw = t
      .middleware()
      .query(tokenSchema)
      .handler(async (_args, next) => {
        return await next();
      });
    const layout = t.layout("/*").use(layoutMw);

    // Route validates query 'page'
    const pageSchema = createNumberCoerceSchema("page");
    const route = t
      .get("/multi-query")
      .query(pageSchema)
      .handler(({ req }) => {
        return Response.json({
          token: req.query.token,
          page: req.query.page,
          extra: req.query.extra,
        });
      });

    const app = createTaserApp({
      layouts: {
        "/*": layout,
      },
      routes: {
        "/multi-query": {
          GET: {
            layouts: ["/*"],
            route,
          },
        },
      },
    });

    const res = await app.request(
      "http://localhost/multi-query?token=secret123&page=5&extra=unvalidated",
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBe("secret123");
    expect(data.page).toBe(5);
    expect(data.extra).toBe("unvalidated");
  });

  it("stores .returns(Record<StatusCode, Schema>) on route definitions", () => {
    const schema200 = createNumberCoerceSchema("id");
    const schema400 = createNumberCoerceSchema("error");

    const route = t
      .get("/check")
      .returns({ 200: schema200, 400: schema400 })
      .handler(() => Response.json({ ok: true }));

    expect(route.returns).toBeDefined();
    expect(route.returns?.[200]).toBe(schema200);
    expect(route.returns?.[400]).toBe(schema400);
  });

  it("allows middleware to catch ValidationError before app.onError", async () => {
    const mw = async (_args: any, next: any) => {
      try {
        return await next();
      } catch (err: any) {
        if (err.name === "ValidationError") {
          return Response.json({ customHandled: true }, { status: 400 });
        }
        throw err;
      }
    };

    const route = t
      .get("/protected/:id")
      .use(mw)
      .params(createNumberCoerceSchema("id"))
      .handler(() => Response.json({ ok: true }));

    const app = createTaserApp({
      routes: {
        "/protected/:id": {
          GET: { route },
        },
      },
    });

    const res = await app.request("http://localhost/protected/invalid");
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ customHandled: true });
  });

  it("extracts and validates form body (multipart)", async () => {
    let capturedBody: unknown;

    const formSchema: StandardSchemaV1<Record<string, unknown>, Record<string, unknown>> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate(value: unknown) {
          const rec = value as Record<string, unknown>;
          return { value: { ...rec, title: String(rec.title).toUpperCase() } };
        },
      },
    };

    const route = t
      .post("/upload")
      .body(formSchema, "form")
      .handler(({ req }) => {
        capturedBody = req.body;
        return Response.json(req.body);
      });

    const app = createTaserApp({
      routes: {
        "/upload": {
          POST: { route },
        },
      },
    });

    const formData = new FormData();
    formData.append("title", "my document");

    const res = await app.request("http://localhost/upload", {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(200);
    expect(capturedBody).toEqual({ title: "MY DOCUMENT" });
  });

  it("extracts and validates text body", async () => {
    let capturedBody: unknown;

    const textSchema: StandardSchemaV1<string, string> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate(value: unknown) {
          return { value: (value as string).trim() };
        },
      },
    };

    const route = t
      .post("/raw-text")
      .body(textSchema, "text")
      .handler(({ req }) => {
        capturedBody = req.body;
        return Response.json({ text: req.body });
      });

    const app = createTaserApp({
      routes: {
        "/raw-text": {
          POST: { route },
        },
      },
    });

    const res = await app.request("http://localhost/raw-text", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "   trimmed text   ",
    });

    expect(res.status).toBe(200);
    expect(capturedBody).toBe("trimmed text");
  });

  it("extracts and passes raw request for raw mode", async () => {
    let capturedBody: unknown;

    const rawSchema: StandardSchemaV1<Request, Request> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate(value: unknown) {
          return { value: value as Request };
        },
      },
    };

    const route = t
      .post("/stream")
      .body(rawSchema, "raw")
      .handler(({ req }) => {
        capturedBody = req.body;
        return Response.json({ isRequest: req.body instanceof Request });
      });

    const app = createTaserApp({
      routes: {
        "/stream": {
          POST: { route },
        },
      },
    });

    const res = await app.request("http://localhost/stream", {
      method: "POST",
      headers: { "content-type": "application/octet-stream" },
      body: "binary-payload",
    });

    expect(res.status).toBe(200);
    expect(capturedBody).toBeInstanceOf(Request);
  });

  it("skips body parsing when route has no body schema", async () => {
    let capturedBody: unknown;

    const route = t.post("/no-schema").handler(({ req }) => {
      capturedBody = req.body;
      return Response.json({ bodyParsed: req.body !== undefined });
    });

    const app = createTaserApp({
      routes: {
        "/no-schema": {
          POST: { route },
        },
      },
    });

    const res = await app.request("http://localhost/no-schema", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });

    expect(res.status).toBe(200);
    expect(capturedBody).toBeUndefined();
  });
});

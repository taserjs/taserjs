import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  defineTaser,
  t,
  ResponseValidationError,
  ValidationError,
  type StandardSchemaV1,
} from "@taserjs/router";
import { json, ok } from "@taserjs/router/reply";
import { createTaserApp } from "../src/index.js";

function createTestSchema<T>(
  validateFn: (
    val: unknown,
  ) => { value: T } | { issues: Array<{ message: string; path?: Array<string | number> }> },
): StandardSchemaV1<unknown, T> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: (val: unknown) => validateFn(val),
    },
  };
}

const userSchema = createTestSchema((val: unknown) => {
  if (typeof val === "object" && val !== null && "id" in val && "name" in val) {
    return { value: val as { id: string; name: string } };
  }
  return {
    issues: [{ message: "Expected user object with id and name", path: ["id"] }],
  };
});

const errorSchema = createTestSchema((val: unknown) => {
  if (typeof val === "object" && val !== null && "error" in val) {
    return { value: val as { error: string } };
  }
  return {
    issues: [{ message: "Expected error object with error field", path: ["error"] }],
  };
});

describe("Response Contracts & Validation Pipeline", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("passes response through when payload matches declared .returns() schema", async () => {
    const route = t
      .get("/user")
      .returns({
        200: userSchema,
        404: errorSchema,
      })
      .handler(async () => {
        return ok({ id: "u-123", name: "Alice" });
      });

    const app = createTaserApp({
      routes: {
        "/user": {
          GET: { route },
        },
      },
    });

    const res = await app.request("/user");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: "u-123", name: "Alice" });
  });

  it("throws ResponseValidationError and returns 500 when response payload violates .returns() schema", async () => {
    const onErrorSpy = vi.fn();
    const taserDef = defineTaser().onError(onErrorSpy);

    const route = t
      .get("/user-invalid")
      .returns({
        200: userSchema,
      })
      .handler(async () => {
        // Missing name
        return ok({ id: "u-123" } as any);
      });

    const app = createTaserApp(
      {
        routes: {
          "/user-invalid": {
            GET: { route },
          },
        },
      },
      taserDef,
    );

    const res = await app.request("/user-invalid");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toBe("Response Validation Failed");
    expect(body.status).toBe(200);
    expect(body.data).toEqual({ id: "u-123" });
    expect(body.issues).toEqual([
      { message: "Expected user object with id and name", path: ["id"] },
    ]);
    // Must bypass custom onError
    expect(onErrorSpy).not.toHaveBeenCalled();
  });

  it("validates cloned response body when handler returns standard Response without _data", async () => {
    const route = t
      .get("/raw-response")
      .returns({
        200: userSchema,
      })
      .handler(async () => {
        return new Response(JSON.stringify({ invalid: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      });

    const app = createTaserApp({
      routes: {
        "/raw-response": {
          GET: { route },
        },
      },
    });

    const res = await app.request("/raw-response");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.issues).toHaveLength(1);
    expect(body.data).toEqual({ invalid: true });
  });

  it("strictly bypasses response validation in production (NODE_ENV=production) even if response.validate is true", async () => {
    process.env.NODE_ENV = "production";

    const taserDef = defineTaser({ response: { validate: true } });

    const route = t
      .get("/prod-bypass")
      .returns({
        200: userSchema,
      })
      .handler(async () => {
        // Invalid shape that would fail in dev
        return ok({ totallyBroken: true } as any);
      });

    const app = createTaserApp(
      {
        routes: {
          "/prod-bypass": {
            GET: { route },
          },
        },
      },
      taserDef,
    );

    const res = await app.request("/prod-bypass");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ totallyBroken: true });
  });

  it("bypasses response validation in development when response.validate is false", async () => {
    const taserDef = defineTaser().response({ validate: false });

    const route = t
      .get("/explicit-disable")
      .returns({
        200: userSchema,
      })
      .handler(async () => {
        return ok({ unvalidated: true } as any);
      });

    const app = createTaserApp(
      {
        routes: {
          "/explicit-disable": {
            GET: { route },
          },
        },
      },
      taserDef,
    );

    const res = await app.request("/explicit-disable");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ unvalidated: true });
  });

  it("allows middleware to catch and transform ResponseValidationError and ValidationError using standard try/catch", async () => {
    const rootLayout = t.layout("/*").use(async (_args, next) => {
      try {
        return await next();
      } catch (err) {
        if (err instanceof ValidationError) {
          return json(
            {
              customValidationAlert: true,
              facet: err.facet,
              reasons: err.issues.map((i) => i.message),
            },
            { status: 400 },
          );
        }
        if (err instanceof ResponseValidationError) {
          return json(
            {
              customContractAlert: true,
              brokenStatus: err.status,
              reasons: err.issues.map((i) => i.message),
            },
            { status: 500 },
          );
        }
        throw err;
      }
    });

    const route = t
      .get("/transformed-failure")
      .returns({
        200: userSchema,
      })
      .handler(async () => {
        return ok({ wrongPayload: 123 } as any);
      });

    const reqValidationRoute = t
      .get("/request-validation-failure")
      .query(
        createTestSchema((val: unknown) => {
          if (typeof val === "object" && val !== null && "tag" in val) {
            return { value: val };
          }
          return { issues: [{ message: "Missing required tag query param" }] };
        }),
      )
      .handler(async () => {
        return ok({ success: true });
      });

    const app = createTaserApp({
      layouts: {
        "/*": rootLayout,
      },
      routes: {
        "/transformed-failure": {
          GET: {
            layouts: ["/*"],
            route,
          },
        },
        "/request-validation-failure": {
          GET: {
            layouts: ["/*"],
            route: reqValidationRoute,
          },
        },
      },
    });

    // 1. Response validation error caught and transformed by layout middleware
    const res = await app.request("/transformed-failure");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({
      customContractAlert: true,
      brokenStatus: 200,
      reasons: ["Expected user object with id and name"],
    });

    // 2. Request validation error caught and transformed by same layout middleware
    const reqRes = await app.request("/request-validation-failure");
    expect(reqRes.status).toBe(400);
    const reqBody = await reqRes.json();
    expect(reqBody).toEqual({
      customValidationAlert: true,
      facet: "query",
      reasons: ["Missing required tag query param"],
    });
  });

  it("passes unmapped statuses through without validating", async () => {
    // If a route handler returns a raw Response or status not defined in .returns(),
    // runtime validation skips validation rather than throwing.
    const route = t
      .get("/unmapped-status")
      .returns({
        200: userSchema,
      })
      .handler((async () => {
        // Force a 503 response which has no declared schema in returns
        return new Response("Service Unavailable", { status: 503 });
      }) as any);

    const app = createTaserApp({
      routes: {
        "/unmapped-status": {
          GET: { route },
        },
      },
    });

    const res = await app.request("/unmapped-status");
    expect(res.status).toBe(503);
    const body = await res.text();
    expect(body).toBe("Service Unavailable");
  });
});

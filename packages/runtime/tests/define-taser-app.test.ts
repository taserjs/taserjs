// oxlint-disable no-await-in-loop
import { describe, expect, it, vi } from "vitest";
import { createContext, defineTaser, t, ValidationError } from "@taserjs/router";
import { createTaserApp, UnsupportedMediaTypeError } from "../src/index.js";

describe("createTaserApp with defineTaser and error boundaries", () => {
  it("mounts routes with basePath and provides context to notFound handler", async () => {
    const notFoundSpy = vi.fn(({ req, ctx }: { req: any; ctx: any }) => {
      return Response.json(
        { error: "Custom Not Found", path: req.path, db: ctx.db },
        { status: 404 },
      );
    });

    const taserDef = defineTaser()
      .basePath("/api/v1")
      .context(
        createContext({
          boot: async () => ({ db: "pg-pool" }),
          request: (req) => ({ requestId: req.headers.get("x-request-id") ?? "default-id" }),
        }),
      )
      .notFound(notFoundSpy);

    const app = createTaserApp(
      {
        routes: {
          "/users": {
            GET: {
              route: t
                .get("/users")
                .handler(async ({ ctx }) => Response.json({ success: true, db: (ctx as any).db })),
            },
          },
        },
      },
      taserDef,
    );

    // Matches /api/v1/users
    const validRes = await app.request("/api/v1/users");
    expect(validRes.status).toBe(200);
    const validBody = await validRes.json();
    expect(validBody).toEqual({ success: true, db: "pg-pool" });

    // Unmatched route triggers notFound with { req, ctx }
    const notFoundRes = await app.request("/api/v1/missing");
    expect(notFoundRes.status).toBe(404);
    const notFoundBody = await notFoundRes.json();
    expect(notFoundBody).toEqual({
      error: "Custom Not Found",
      path: "/api/v1/missing",
      db: "pg-pool",
    });
    expect(notFoundSpy).toHaveBeenCalledTimes(1);
    expect(notFoundSpy.mock.calls[0]![0].req.path).toBe("/api/v1/missing");
    expect(notFoundSpy.mock.calls[0]![0].ctx.db).toBe("pg-pool");
  });

  it("handles protocol errors (ValidationError, thrown Response) without invoking custom onError", async () => {
    const onErrorSpy = vi.fn((_err: unknown, _req: any) => {
      return Response.json({ unhandled: true }, { status: 500 });
    });

    const taserDef = defineTaser().onError(onErrorSpy);

    const app = createTaserApp(
      {
        routes: {
          "/validation-error": {
            GET: {
              route: t.get("/validation-error").handler(async () => {
                throw new ValidationError(
                  [{ message: "Field 'name' is required", path: ["name"] }],
                  "body",
                );
              }),
            },
          },
          "/unsupported-media-type": {
            POST: {
              route: t.post("/unsupported-media-type").handler(async () => {
                throw new UnsupportedMediaTypeError("Expected application/json");
              }),
            },
          },
          "/thrown-response": {
            GET: {
              route: t.get("/thrown-response").handler(async () => {
                throw new Response("Custom Forbidden", { status: 403 });
              }),
            },
          },
          "/crash": {
            GET: {
              route: t.get("/crash").handler(async () => {
                throw new Error("Database crashed unexpectedly");
              }),
            },
          },
        },
      },
      taserDef,
    );

    // 1. ValidationError -> 422, onError NOT called
    const valRes = await app.request("/validation-error");
    expect(valRes.status).toBe(422);
    const valBody = await valRes.json();
    expect(valBody.errors).toEqual([{ message: "Field 'name' is required", path: ["name"] }]);
    expect(onErrorSpy).not.toHaveBeenCalled();

    // 2. UnsupportedMediaTypeError -> 415, onError NOT called
    const umtRes = await app.request("/unsupported-media-type", { method: "POST" });
    expect(umtRes.status).toBe(415);
    const umtBody = await umtRes.json();
    expect(umtBody.message).toBe("Expected application/json");
    expect(onErrorSpy).not.toHaveBeenCalled();

    // 3. Thrown Response -> 403, onError NOT called
    const thrownRes = await app.request("/thrown-response");
    expect(thrownRes.status).toBe(403);
    const thrownText = await thrownRes.text();
    expect(thrownText).toBe("Custom Forbidden");
    expect(onErrorSpy).not.toHaveBeenCalled();

    // 4. Unhandled 500 crash -> routes to custom onError
    const crashRes = await app.request("/crash");
    expect(crashRes.status).toBe(500);
    const crashBody = await crashRes.json();
    expect(crashBody).toEqual({ unhandled: true });
    expect(onErrorSpy).toHaveBeenCalledTimes(1);
    expect(onErrorSpy.mock.calls[0]![0]).toBeInstanceOf(Error);
    expect(onErrorSpy.mock.calls[0]![1].path).toBe("/crash");
  });

  it("falls back gracefully when taser definition is omitted", async () => {
    const app = createTaserApp({
      routes: {
        "/ping": {
          GET: {
            route: t.get("/ping").handler(async () => Response.json({ pong: true })),
          },
        },
      },
    });

    const res = await app.request("/ping");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ pong: true });

    const notFoundRes = await app.request("/unmatched");
    expect(notFoundRes.status).toBe(404);
  });

  it("mounts routes cleanly with different basePath formats (trailing slash, missing leading slash)", async () => {
    for (const prefix of ["/api/v1", "/api/v1/", "api/v1"]) {
      const app = createTaserApp(
        {
          routes: {
            "/ping": {
              GET: {
                route: t.get("/ping").handler(async () => Response.json({ ok: true })),
              },
            },
          },
        },
        defineTaser().basePath(prefix),
      );

      const res = await app.request("/api/v1/ping");
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    }
  });
});

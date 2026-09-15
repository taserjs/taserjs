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

  it("keeps root Hono instance base-less so host fallback can handle requests outside basePath", async () => {
    const app = createTaserApp(
      {
        routes: {
          "/": {
            GET: {
              route: t.get("/").handler(async () => Response.json({ api: true })),
            },
          },
          "/hello": {
            GET: {
              route: t.get("/hello").handler(async () => Response.json({ hello: true })),
            },
          },
        },
      },
      defineTaser().basePath("/api"),
    );

    // Host app mounted as fallback via app.all("*")
    const hostFetch = (req: Request) => {
      const url = new URL(req.url);
      if (url.pathname === "/host") {
        return Response.json({ message: "Hello, from Host!" });
      }
      return new Response("Not Found", { status: 404 });
    };

    app.all("*", (c) => hostFetch(c.req.raw));

    // 1. Taser root route under basePath (/api)
    const apiRes = await app.request("/api");
    expect(apiRes.status).toBe(200);
    expect(await apiRes.json()).toEqual({ api: true });

    // 2. Taser sub-route under basePath (/api/hello)
    const helloRes = await app.request("/api/hello");
    expect(helloRes.status).toBe(200);
    expect(await helloRes.json()).toEqual({ hello: true });

    // 3. Host route outside basePath (/host)
    const hostRes = await app.request("/host");
    expect(hostRes.status).toBe(200);
    expect(await hostRes.json()).toEqual({ message: "Hello, from Host!" });

    // 4. Missing route outside basePath (/other)
    const otherRes = await app.request("/other");
    expect(otherRes.status).toBe(404);
  });

  it("handles custom notFound scoped to basePath so unmatched API routes do not leak to host", async () => {
    const notFoundSpy = vi.fn(({ req }: { req: any }) => {
      return Response.json({ error: `Taser Not Found: ${req.path}` }, { status: 404 });
    });

    const app = createTaserApp(
      {
        routes: {
          "/hello": {
            GET: {
              route: t.get("/hello").handler(async () => Response.json({ hello: true })),
            },
          },
        },
      },
      defineTaser().basePath("/api").notFound(notFoundSpy),
    );

    // Host app mounted as fallback via app.all("*")
    const hostFetch = (req: Request) => {
      const url = new URL(req.url);
      if (url.pathname === "/host") {
        return Response.json({ message: "Hello, from Host!" });
      }
      return new Response("Host 404", { status: 404 });
    };

    app.all("*", (c) => hostFetch(c.req.raw));

    // 1. Taser route under /api
    const helloRes = await app.request("/api/hello");
    expect(helloRes.status).toBe(200);
    expect(await helloRes.json()).toEqual({ hello: true });

    // 2. Unmatched route under /api -> handled by Taser custom notFound!
    const apiOtherRes = await app.request("/api/other");
    expect(apiOtherRes.status).toBe(404);
    expect(await apiOtherRes.json()).toEqual({ error: "Taser Not Found: /api/other" });
    expect(notFoundSpy).toHaveBeenCalledTimes(1);

    // 3. Host route outside /api -> handled by host app
    const hostRes = await app.request("/host");
    expect(hostRes.status).toBe(200);
    expect(await hostRes.json()).toEqual({ message: "Hello, from Host!" });

    // 4. Unmatched route outside /api -> handled by host app fallback
    const missingHostRes = await app.request("/missing-page");
    expect(missingHostRes.status).toBe(404);
    expect(await missingHostRes.text()).toBe("Host 404");
  });
});

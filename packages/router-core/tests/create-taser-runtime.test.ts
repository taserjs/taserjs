import { reply } from "@taserjs/router-utils";
import type { Context, Next } from "hono";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createTaserCompatHandler, createTaserRuntime } from "../src/index.js";

describe("createTaserRuntime", () => {
  it("runs layout then route middleware as onion", async () => {
    const order: string[] = [];
    const manifest = {
      layouts: {
        root: {
          middlewares: {
            middlewares: [
              {
                handler: async (_ctx: unknown, next: () => Promise<unknown>) => {
                  order.push("layout-before");
                  const res = await next();
                  order.push("layout-after");
                  return res;
                },
              },
            ],
          },
        },
      },
      routes: {
        "/test": {
          GET: {
            layoutChain: ["root"],
            route: {
              path: "/test",
              method: "GET" as const,
              middlewares: [
                {
                  handler: async (_ctx: unknown, next: () => Promise<unknown>) => {
                    order.push("route-before");
                    const res = await next();
                    order.push("route-after");
                    return res;
                  },
                },
              ],
              handlerMiddlewares: [],
              handler: () => {
                order.push("handler");
                return reply.json({ ok: true });
              },
            },
          },
        },
      },
    };

    const runtime = createTaserRuntime(manifest, () => ({}));
    const response = await runtime.fetch(new Request("http://localhost/test"));
    expect(response.status).toBe(200);
    expect(response instanceof Response).toBe(true);
    expect(await response.json()).toEqual({ ok: true });
    expect(order).toEqual([
      "layout-before",
      "route-before",
      "handler",
      "route-after",
      "layout-after",
    ]);
  });

  it("matches :id and /* splat params", async () => {
    const manifest = {
      layouts: {},
      routes: {
        "/posts/:id": {
          GET: {
            layoutChain: [],
            route: {
              path: "/posts/:id",
              method: "GET" as const,
              middlewares: [],
              handlerMiddlewares: [],
              handler: (ctx: { params: { id: string } }) => reply.json({ id: ctx.params.id }),
            },
          },
        },
        "/files/*": {
          GET: {
            layoutChain: [],
            route: {
              path: "/files/*",
              method: "GET" as const,
              middlewares: [],
              handlerMiddlewares: [],
              handler: (ctx: { params: { _splat: string } }) =>
                reply.json({ splat: ctx.params._splat }),
            },
          },
        },
      },
    };

    const runtime = createTaserRuntime(manifest, () => ({}));

    const postRes = await runtime.fetch(new Request("http://localhost/posts/42"));
    expect(await postRes.json()).toEqual({ id: "42" });

    const splatRes = await runtime.fetch(new Request("http://localhost/files/a/b/c"));
    expect(await splatRes.json()).toEqual({ splat: "a/b/c" });
  });

  it("exposes headers and cookies helpers", async () => {
    const manifest = {
      layouts: {},
      routes: {
        "/test": {
          GET: {
            layoutChain: [],
            route: {
              path: "/test",
              method: "GET" as const,
              middlewares: [],
              handlerMiddlewares: [],
              handler: (ctx: {
                headers: { get: (n: string) => string | undefined };
                cookies: { get: (n: string) => string | undefined };
              }) =>
                reply.json({
                  auth: ctx.headers.get("authorization"),
                  token: ctx.cookies.get("token"),
                }),
            },
          },
        },
      },
    };

    const runtime = createTaserRuntime(manifest, () => ({}));
    const response = await runtime.fetch(
      new Request("http://localhost/test", {
        headers: {
          authorization: "Bearer abc",
          cookie: "token=xyz",
        },
      }),
    );
    expect(await response.json()).toEqual({ auth: "Bearer abc", token: "xyz" });
  });

  it("sets cookies on the response via ctx.cookies.set", async () => {
    const manifest = {
      layouts: {},
      routes: {
        "/test": {
          GET: {
            layoutChain: [],
            route: {
              path: "/test",
              method: "GET" as const,
              middlewares: [],
              handlerMiddlewares: [],
              handler: (ctx: { cookies: { set: (n: string, v: string) => void } }) => {
                ctx.cookies.set("session", "abc");
                return reply.json({ ok: true });
              },
            },
          },
        },
      },
    };

    const runtime = createTaserRuntime(manifest, () => ({}));
    const response = await runtime.fetch(new Request("http://localhost/test"));
    const cookies = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie")!];
    expect(cookies).toEqual(expect.arrayContaining([expect.stringContaining("session=abc")]));
    expect(cookies.join("; ")).toMatch(/HttpOnly/i);
    expect(cookies.join("; ")).toMatch(/SameSite=Lax/i);
  });

  it("preserves middleware header mutations on the wire Response", async () => {
    const manifest = {
      layouts: {
        root: {
          middlewares: {
            middlewares: [
              {
                handler: async (_ctx: unknown, next: () => Promise<Response>) => {
                  const res = await next();
                  res.headers.set("X-Layout", "1");
                  return res;
                },
              },
            ],
          },
        },
      },
      routes: {
        "/test": {
          GET: {
            layoutChain: ["root"],
            route: {
              path: "/test",
              method: "GET" as const,
              middlewares: [],
              handlerMiddlewares: [],
              handler: () => reply.json({ ok: true }),
            },
          },
        },
      },
    };

    const response = await createTaserRuntime(manifest, () => ({})).fetch(
      new Request("http://localhost/test"),
    );
    expect(response.headers.get("X-Layout")).toBe("1");
    expect(await response.json()).toEqual({ ok: true });
  });

  it("matches prefixed route registrations", async () => {
    const manifest = {
      layouts: {},
      routes: {
        "/hello": {
          GET: {
            layoutChain: [],
            route: {
              path: "/hello",
              method: "GET" as const,
              middlewares: [],
              handlerMiddlewares: [],
              handler: () => reply.json({ ok: true }),
            },
          },
        },
      },
    };

    const runtime = createTaserRuntime(manifest, () => ({}), { basePath: "/api" });
    const response = await runtime.fetch(new Request("http://localhost/api/hello"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("fetch matches route created with basePath", async () => {
    const manifest = {
      layouts: {},
      routes: {
        "/hello": {
          GET: {
            layoutChain: [],
            route: {
              path: "/hello",
              method: "GET" as const,
              middlewares: [],
              handlerMiddlewares: [],
              handler: () => reply.json({ ok: true }),
            },
          },
        },
      },
    };

    const runtime = createTaserRuntime(manifest, () => ({}), { basePath: "/api" });
    const response = await runtime.fetch(new Request("http://localhost/api/hello"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("wires notFound and onError post-create", async () => {
    const runtime = createTaserRuntime({ layouts: {}, routes: {} }, () => ({}))
      .notFound(() => reply.text("gone", { status: 404 }))
      .onError(() => reply.internalServerError({ message: "handled" }));

    const missing = await runtime.fetch(new Request("http://localhost/missing"));
    expect(missing.status).toBe(404);
    expect(await missing.text()).toBe("gone");
  });

  it("parses JSON body via Hono", async () => {
    const manifest = {
      layouts: {},
      routes: {
        "/echo": {
          POST: {
            layoutChain: [],
            route: {
              path: "/echo",
              method: "POST" as const,
              middlewares: [],
              handlerMiddlewares: [],
              body: z.object({ name: z.string() }),
              handler: (ctx: { body: { name: string } }) => reply.json(ctx.body),
            },
          },
        },
      },
    };

    const runtime = createTaserRuntime(manifest, () => ({}));
    const response = await runtime.fetch(
      new Request("http://localhost/echo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Ada" }),
      }),
    );
    expect(await response.json()).toEqual({ name: "Ada" });
  });

  it("parses urlencoded body via Hono parseBody", async () => {
    const manifest = {
      layouts: {},
      routes: {
        "/form": {
          POST: {
            layoutChain: [],
            route: {
              path: "/form",
              method: "POST" as const,
              middlewares: [],
              handlerMiddlewares: [],
              body: z.object({ title: z.string() }),
              handler: (ctx: { body: { title: string } }) => reply.json(ctx.body),
            },
          },
        },
      },
    };

    const runtime = createTaserRuntime(manifest, () => ({}));
    const response = await runtime.fetch(
      new Request("http://localhost/form", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "title=Hello",
      }),
    );
    expect(await response.json()).toEqual({ title: "Hello" });
  });

  it("returns 422 when route query validation fails", async () => {
    const manifest = {
      layouts: {},
      routes: {
        "/search": {
          GET: {
            layoutChain: [],
            route: {
              path: "/search",
              method: "GET" as const,
              middlewares: [],
              handlerMiddlewares: [],
              query: z.object({ page: z.number() }),
              handler: () => reply.json({ ok: true }),
            },
          },
        },
      },
    };

    const runtime = createTaserRuntime(manifest, () => ({}));
    const response = await runtime.fetch(new Request("http://localhost/search?page=1"));
    expect(response.status).toBe(422);
    const body = (await response.json()) as { errors: unknown[] };
    expect(body.errors.length).toBeGreaterThan(0);
  });

  describe("defineMiddleware Hono bridge integration", () => {
    it("runs Hono middleware in layout chain", async () => {
      const order: string[] = [];

      // Mock CORS-like Hono middleware
      const corsMiddleware = {
        handler: createTaserCompatHandler(async (c: Context, next: Next) => {
          order.push("cors-before");
          c.header("Access-Control-Allow-Origin", "*");
          const result = await next();
          order.push("cors-after");
          return result;
        }),
      };

      const manifest = {
        layouts: {
          api: {
            middlewares: {
              middlewares: [corsMiddleware],
            },
          },
        },
        routes: {
          "/api/test": {
            GET: {
              layoutChain: ["api"],
              route: {
                path: "/api/test",
                method: "GET" as const,
                middlewares: [],
                handlerMiddlewares: [],
                handler: () => {
                  order.push("handler");
                  return reply.json({ message: "test" });
                },
              },
            },
          },
        },
      };

      const runtime = createTaserRuntime(manifest, () => ({}));
      const response = await runtime.fetch(new Request("http://localhost/api/test"));

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(order).toEqual(["cors-before", "handler", "cors-after"]);
    });

    it("runs Hono middleware in route chain", async () => {
      // Mock JWT-like Hono middleware
      const jwtMiddleware = {
        handler: createTaserCompatHandler(async (c: Context, next: Next) => {
          const auth = c.req.header("authorization");
          if (!auth?.startsWith("Bearer ")) {
            return new Response("Unauthorized", { status: 401 });
          }
          c.set("user", { id: "test-user" });
          return next();
        }),
      };

      const manifest = {
        layouts: {},
        routes: {
          "/protected": {
            GET: {
              layoutChain: [],
              route: {
                path: "/protected",
                method: "GET" as const,
                middlewares: [jwtMiddleware],
                handlerMiddlewares: [],
                handler: (ctx: { var: { user: { id: string } } }) => {
                  return reply.json({
                    message: "Protected resource",
                    user: ctx.var.user,
                  });
                },
              },
            },
          },
        },
      };

      const runtime = createTaserRuntime(manifest, () => ({}));

      // Test unauthorized request
      const unauthorizedResponse = await runtime.fetch(new Request("http://localhost/protected"));
      expect(unauthorizedResponse.status).toBe(401);
      expect(await unauthorizedResponse.text()).toBe("Unauthorized");

      // Test authorized request
      const authorizedResponse = await runtime.fetch(
        new Request("http://localhost/protected", {
          headers: { authorization: "Bearer valid-token" },
        }),
      );
      expect(authorizedResponse.status).toBe(200);
      const body = await authorizedResponse.json();
      expect(body).toEqual({
        message: "Protected resource",
        user: { id: "test-user" },
      });
    });

    it("chains multiple Hono middlewares", async () => {
      const order: string[] = [];

      const loggerMiddleware = {
        handler: createTaserCompatHandler(async (c: Context, next: Next) => {
          order.push("logger-start");
          const start = Date.now();
          const result = await next();
          const duration = Date.now() - start;
          order.push(`logger-end:${duration}ms`);
          c.header("X-Response-Time", `${duration}ms`);
          return result;
        }),
      };

      const compressionMiddleware = {
        handler: createTaserCompatHandler(async (c: Context, next: Next) => {
          order.push("compression-start");
          const result = await next();
          order.push("compression-end");
          c.header("Content-Encoding", "gzip");
          return result;
        }),
      };

      const manifest = {
        layouts: {},
        routes: {
          "/chained": {
            GET: {
              layoutChain: [],
              route: {
                path: "/chained",
                method: "GET" as const,
                middlewares: [loggerMiddleware, compressionMiddleware],
                handlerMiddlewares: [],
                handler: () => {
                  order.push("handler");
                  return reply.json({ ok: true });
                },
              },
            },
          },
        },
      };

      const runtime = createTaserRuntime(manifest, () => ({}));
      const response = await runtime.fetch(new Request("http://localhost/chained"));

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Encoding")).toBe("gzip");
      expect(response.headers.get("X-Response-Time")).toMatch(/^\d+ms$/);
      expect(order).toEqual([
        "logger-start",
        "compression-start",
        "handler",
        "compression-end",
        expect.stringMatching(/^logger-end:\d+ms$/),
      ]);
    });
  });
});

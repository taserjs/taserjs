import "./register.js";
import { describe, expect, it } from "vitest";
import type { MiddlewareHandler } from "hono";
import { sign } from "hono/jwt";
import { z } from "zod";

import { createTaserRuntime } from "@taserjs/router-core";

import { createTaserApp, reply } from "../src/index.js";
import { jwt } from "../src/middleware/jwt.js";
import { jwk } from "../src/middleware/jwk.js";
import { createAuthMiddleware } from "../src/middleware/auth.js";

describe("auth middleware hardening", () => {
  const t = createTaserApp().context({});
  const secret = "test-secret";

  async function runRoute(route: object, request: Request): Promise<Response> {
    const manifest = {
      layouts: {},
      routes: {
        "/hello": {
          GET: {
            layoutChain: [],
            route,
          },
        },
      },
    };
    const runtime = createTaserRuntime(manifest, () => ({}));
    return runtime.fetch(request);
  }

  it("returns 403 when token is valid but payload fails schema", async () => {
    const token = await sign({ sub: "user-123" }, secret, "HS256");
    const built = t
      .get("/hello")
      .use(jwt(z.object({ sub: z.string(), role: z.string() }), { secret, alg: "HS256" }))
      .handler(() => reply.json({ ok: true }));

    const response = await runRoute(
      built,
      new Request("http://localhost/hello", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(response.status).toBe(403);
  });

  it("returns 403 when jwtPayload is missing and schema is required", async () => {
    const passthroughMw: MiddlewareHandler = async (_c, next) => {
      await next();
    };
    const built = t
      .get("/hello")
      .use(createAuthMiddleware(z.object({ sub: z.string() }), passthroughMw))
      .handler(() => reply.json({ ok: true }));

    const response = await runRoute(built, new Request("http://localhost/hello"));
    expect(response.status).toBe(403);
  });

  it("jwk rejects http JWKS URLs by default", () => {
    expect(() =>
      jwk(z.object({ sub: z.string() }), {
        jwks_uri: "http://localhost:8080/jwks",
        alg: ["RS256"],
      }),
    ).toThrow("https://");
  });

  it("jwk accepts https JWKS URLs", () => {
    expect(() =>
      jwk(z.object({ sub: z.string() }), {
        jwks_uri: "https://valid.example.com/.well-known/jwks.json",
        alg: ["RS256"],
      }),
    ).not.toThrow();
  });

  it("jwk allowInsecure permits http JWKS URLs", () => {
    expect(() =>
      jwk(z.object({ sub: z.string() }), {
        jwks_uri: "http://localhost:8080/jwks",
        alg: ["RS256"],
        allowInsecure: true,
      }),
    ).not.toThrow();
  });
});

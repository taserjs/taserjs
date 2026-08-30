import "./register.js";
import { describe, expect, expectTypeOf, it } from "vitest";
import { sign } from "hono/jwt";

import { createTaserRuntime } from "@taserjs/router-core";

import { t } from "../src/index.js";
import { json } from "../src/reply.js";
import { jwt } from "../src/middleware/jwt.js";
import { jwk } from "../src/middleware/jwk.js";

describe("jwt and jwk middleware", () => {
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
    const res = await runtime.fetch(request);
    return res!;
  }

  it("returns 401 when token is missing or invalid", async () => {
    const built = t
      .get("/hello")
      .use(jwt({ secret, alg: "HS256" }))
      .handler((ctx) => {
        expectTypeOf(ctx.state.jwtPayload).toEqualTypeOf<Record<string, unknown>>();
        return json({ ok: true });
      });

    const response = await runRoute(built, new Request("http://localhost/hello"));
    expect(response.status).toBe(401);
  });

  it("supports typed generic payload", async () => {
    type UserPayload = { sub: string; role: "admin" | "user" };
    const token = await sign({ sub: "user-123", role: "admin" }, secret, "HS256");

    const built = t
      .get("/hello")
      .use(jwt<UserPayload>({ secret, alg: "HS256" }))
      .handler((ctx) => {
        expectTypeOf(ctx.state.jwtPayload).toEqualTypeOf<UserPayload>();
        return json({ sub: ctx.state.jwtPayload.sub, role: ctx.state.jwtPayload.role });
      });

    const response = await runRoute(
      built,
      new Request("http://localhost/hello", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sub: "user-123", role: "admin" });
  });

  it("jwk rejects http JWKS URLs by default", () => {
    expect(() =>
      jwk({
        jwks_uri: "http://localhost:8080/jwks",
        alg: ["RS256"],
      }),
    ).toThrow("https://");
  });

  it("jwk accepts https JWKS URLs", () => {
    expect(() =>
      jwk({
        jwks_uri: "https://valid.example.com/.well-known/jwks.json",
        alg: ["RS256"],
      }),
    ).not.toThrow();
  });

  it("jwk allowInsecure permits http JWKS URLs", () => {
    expect(() =>
      jwk({
        jwks_uri: "http://localhost:8080/jwks",
        alg: ["RS256"],
        allowInsecure: true,
      }),
    ).not.toThrow();
  });
});

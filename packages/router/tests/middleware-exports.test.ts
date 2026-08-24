import "./register.js";
import { describe, expect, expectTypeOf, it } from "vitest";
import { sign } from "hono/jwt";

import { createTaserRuntime } from "@taserjs/router-core";

import { cors } from "../src/middleware/cors.js";
import { createTaserApp } from "../src/index.js";
import { json } from "../src/reply.js";
import { jwt } from "../src/middleware/jwt.js";

describe("middleware subpath exports", () => {
  const t = createTaserApp().context({});

  it("cors() returns a MiddlewareUnit with a handler", () => {
    const unit = cors({ origin: "*" });
    expect(typeof unit.handler).toBe("function");
  });

  it("cors sets Access-Control-Allow-Origin at runtime", async () => {
    const route = t
      .get("/hello")
      .use(cors({ origin: "*" }))
      .handler(() => json({ ok: true }));

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

    const response = await createTaserRuntime(manifest, () => ({})).fetch(
      new Request("http://localhost/hello"),
    );
    expect(response!.status).toBe(200);
    expect(response!.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("jwt injects validated payload into ctx.state.jwtPayload", async () => {
    const secret = "test-secret";
    const token = await sign({ sub: "user-123" }, secret, "HS256");

    const route = t
      .get("/hello")
      .use(jwt<{ sub: string }>({ secret, alg: "HS256" }))
      .handler((ctx) => {
        expectTypeOf(ctx.state.jwtPayload.sub).toEqualTypeOf<string>();
        return json({ sub: ctx.state.jwtPayload.sub });
      });

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

    const unauthorized = await runtime.fetch(new Request("http://localhost/hello"));
    expect(unauthorized!.status).toBe(401);

    const authorized = await runtime.fetch(
      new Request("http://localhost/hello", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(authorized!.status).toBe(200);
    expect(await authorized!.json()).toEqual({ sub: "user-123" });
  });
});

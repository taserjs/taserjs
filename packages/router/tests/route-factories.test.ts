import { describe, expect, it } from "vitest";

import { createTaserApp } from "../src/index.js";
import { json, noContent } from "../src/reply.js";
import "./register.js";

describe("route factories", () => {
  const t = createTaserApp().context({});

  it("builds no-body routes including options and head", () => {
    const get = t.get("/hello").handler(() => json({ ok: true }));
    const del = t.delete("/hello").handler(() => json({ ok: true }));
    const options = t.options("/hello").handler(() => noContent());
    const head = t.head("/hello").handler(() => noContent());

    expect(get.method).toBe("GET");
    expect(del.method).toBe("DELETE");
    expect(options.method).toBe("OPTIONS");
    expect(head.method).toBe("HEAD");
  });

  it("builds with-body routes", () => {
    expect(t.post("/hello").handler(() => json({})).method).toBe("POST");
    expect(t.put("/hello").handler(() => json({})).method).toBe("PUT");
    expect(t.patch("/hello").handler(() => json({})).method).toBe("PATCH");
  });

  it("builds any and all routes", () => {
    const any = t.any("/hello", ["GET", "OPTIONS"]).handler(() => json({ ok: true }));
    const all = t.all("/hello").handler(() => json({ ok: true }));

    expect(any.method).toBe("ANY");
    expect(any.methods).toEqual(["GET", "OPTIONS"]);
    expect(all.method).toBe("ALL");
  });

  it("does not export legacy route factories from the public entry", async () => {
    const exported = await import("../src/index.js");
    expect("createAnyRoute" in exported).toBe(false);
    expect("createAllRoute" in exported).toBe(false);
    expect("createRouteBuilder" in exported).toBe(false);
  });

  it("supports t.defineMiddleware with context inheritance", () => {
    const customT = createTaserApp().context({
      boot: () => ({ serviceName: "test-service" }),
    });

    const mw = customT.defineMiddleware((ctx, next) => {
      expect(ctx.serviceName).toBeDefined();
      return next();
    });

    expect(typeof mw.handler).toBe("function");
  });

  it("supports fluent chaining of query, params, and body", () => {
    const route = t
      .post("/users/:id")
      .params({ id: "string" } as any)
      .query({ filter: "string" } as any)
      .body("form", { avatar: "file" } as any)
      .handler(() => json({ ok: true }));

    expect(route.params).toBeDefined();
    expect(route.query).toBeDefined();
    expect(route.body).toBeDefined();
    expect(route.bodyMode).toBe("form");
  });

  it("supports default json body mode", () => {
    const route = t
      .post("/hello")
      .body({ name: "string" } as any)
      .handler(() => json({ ok: true }));

    expect(route.body).toBeDefined();
    expect(route.bodyMode).toBe("json");
  });
});

import { describe, expect, it } from "vitest";

import {
  all,
  any,
  del,
  get,
  head,
  layout,
  middleware,
  options,
  patch,
  post,
  put,
  query,
  t,
} from "../src/index.js";
import { json, noContent } from "../src/reply.js";
import "./register.js";

describe("route factories", () => {
  it("builds no-body routes including options and head via t", () => {
    const getRoute = t.get("/hello").handler(() => json({ ok: true }));
    const delRoute = t.delete("/hello").handler(() => json({ ok: true }));
    const optionsRoute = t.options("/hello").handler(() => noContent());
    const headRoute = t.head("/hello").handler(() => noContent());

    expect(getRoute.method).toBe("GET");
    expect(delRoute.method).toBe("DELETE");
    expect(optionsRoute.method).toBe("OPTIONS");
    expect(headRoute.method).toBe("HEAD");
  });

  it("builds no-body routes via standalone functions", () => {
    const getRoute = get("/hello").handler(() => json({ ok: true }));
    const delRoute = del("/hello").handler(() => json({ ok: true }));
    const optionsRoute = options("/hello").handler(() => noContent());
    const headRoute = head("/hello").handler(() => noContent());

    expect(getRoute.method).toBe("GET");
    expect(delRoute.method).toBe("DELETE");
    expect(optionsRoute.method).toBe("OPTIONS");
    expect(headRoute.method).toBe("HEAD");
  });

  it("builds with-body routes via t and standalone functions", () => {
    expect(t.post("/hello").handler(() => json({})).method).toBe("POST");
    expect(t.put("/hello").handler(() => json({})).method).toBe("PUT");
    expect(t.patch("/hello").handler(() => json({})).method).toBe("PATCH");
    expect(t.query("/hello").handler(() => json({})).method).toBe("QUERY");

    expect(post("/hello").handler(() => json({})).method).toBe("POST");
    expect(put("/hello").handler(() => json({})).method).toBe("PUT");
    expect(patch("/hello").handler(() => json({})).method).toBe("PATCH");
    expect(query("/hello").handler(() => json({})).method).toBe("QUERY");
  });

  it("builds any and all routes", () => {
    const anyRoute = t.any("/hello", ["GET", "OPTIONS"]).handler(() => json({ ok: true }));
    const allRoute = t.all("/hello").handler(() => json({ ok: true }));

    expect(anyRoute.method).toBe("ANY");
    expect(anyRoute.methods).toEqual(["GET", "OPTIONS"]);
    expect(allRoute.method).toBe("ALL");

    expect(any("/hello", ["GET"]).method).toBe("ANY");
    expect(all("/hello").method).toBe("ALL");
  });

  it("supports standalone layout and middleware functions", () => {
    const l1 = t.layout("admin").use((_ctx, next) => next());
    const l2 = layout("admin").use((_ctx, next) => next());
    expect(l1.layout).toBe("admin");
    expect(l2.layout).toBe("admin");

    const mw1 = t.middleware((_ctx, next) => next());
    const mw2 = middleware((_ctx, next) => next());
    expect(typeof mw1.handler).toBe("function");
    expect(typeof mw2.handler).toBe("function");
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

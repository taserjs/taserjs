import { describe, it, expect } from "vitest";
import { t } from "../src/index.js";

describe("Route builder (t.get, t.post, t.put, t.delete, t.patch)", () => {
  it("builds a GET route definition with method, path, and handler", () => {
    const handler = () => new Response("ok");
    const route = t.get("/hello").handler(handler);

    expect(route).toBeDefined();
    expect(route.kind).toBe("route");
    expect(route.method).toBe("GET");
    expect(route.path).toBe("/hello");
    expect(route.handler).toBe(handler);
  });

  it("builds POST, PUT, DELETE, and PATCH route definitions", () => {
    const dummyHandler = () => new Response("ok");

    const postRoute = t.post("/items").handler(dummyHandler);
    expect(postRoute.method).toBe("POST");
    expect(postRoute.path).toBe("/items");
    expect(postRoute.kind).toBe("route");

    const putRoute = t.put("/items/:id").handler(dummyHandler);
    expect(putRoute.method).toBe("PUT");
    expect(putRoute.path).toBe("/items/:id");

    const deleteRoute = t.delete("/items/:id").handler(dummyHandler);
    expect(deleteRoute.method).toBe("DELETE");
    expect(deleteRoute.path).toBe("/items/:id");

    const patchRoute = t.patch("/items/:id").handler(dummyHandler);
    expect(patchRoute.method).toBe("PATCH");
    expect(patchRoute.path).toBe("/items/:id");
  });

  it("supports .use() middleware registration on route builder", () => {
    const mw1 = async (_args: any, next: any) => next();
    const mw2 = async (_args: any, next: any) => next();
    const handler = () => new Response("ok");

    const route = t.get("/test").use(mw1).use(mw2).handler(handler);

    expect(route.kind).toBe("route");
    expect(route.middlewares).toHaveLength(2);
    expect(route.middlewares?.[0]).toBe(mw1);
    expect(route.middlewares?.[1]).toBe(mw2);
  });

  it("builds a layout with t.layout() and registers middlewares via .use()", () => {
    const mw1 = async (_args: any, next: any) => next();
    const mw2 = { handler: async (_args: any, next: any) => next() };

    const layout = t.layout("/*").use(mw1).use(mw2);

    expect(layout.kind).toBe("layout");
    expect(layout.path).toBe("/*");
    expect(layout.middlewares).toHaveLength(2);
    expect(layout.middlewares[0]).toBe(mw1);
    expect(layout.middlewares[1]).toBe(mw2.handler);
  });

  it("builds a pathless layout with t.layout()", () => {
    const layout = t.layout();
    expect(layout.kind).toBe("layout");
    expect(layout.path).toBeUndefined();
    expect(layout.middlewares).toEqual([]);
  });
});

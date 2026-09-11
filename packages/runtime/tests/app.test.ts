import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { t } from "@taserjs/router";
import { created, json } from "@taserjs/utils";
import { createTaserApp } from "../src/index.js";

describe("createTaserApp and Hono runtime dispatch", () => {
  it("returns a native Hono app instance", () => {
    const app = createTaserApp({
      routes: {},
    });
    expect(app).toBeInstanceOf(Hono);
  });

  it("dispatches GET request to registered route handler and returns JSON response", async () => {
    const helloRoute = t
      .get("/hello")
      .handler(({ req }) => json({ message: "hello world", method: req.method }));

    const app = createTaserApp({
      routes: {
        "/hello": {
          GET: {
            route: helloRoute,
          },
        },
      },
    });

    const res = await app.request("/hello");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    const data = await res.json();
    expect(data).toEqual({ message: "hello world", method: "GET" });
  });

  it("extracts req.params and req.query from canonical route path", async () => {
    const userRoute = t.get("/users/:id").handler(({ req }) => {
      return json({
        userId: req.params.id,
        filter: req.query.filter,
      });
    });

    const app = createTaserApp({
      routes: {
        "/users/:id": {
          GET: {
            route: userRoute,
          },
        },
      },
    });

    const res = await app.request("/users/42?filter=active");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ userId: "42", filter: "active" });
  });

  it("extracts req.params._splat for wildcard routes", async () => {
    const fileRoute = t.get("/files/*").handler(({ req }) => {
      return json({
        splat: req.params._splat,
      });
    });

    const app = createTaserApp({
      routes: {
        "/files/*": {
          GET: {
            route: fileRoute,
          },
        },
      },
    });

    const res = await app.request("/files/docs/2026/spec.pdf");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ splat: "docs/2026/spec.pdf" });
  });

  it("supports multiple HTTP methods on different paths", async () => {
    const postRoute = t.post("/items").handler(({ req }) => {
      return created({ created: true, path: req.url });
    });

    const app = createTaserApp({
      routes: {
        "/items": {
          POST: {
            route: postRoute,
          },
        },
      },
    });

    const res = await app.request("/items", { method: "POST" });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.created).toBe(true);
  });

  it("exposes Hono context on ctx.context escape hatch", async () => {
    let capturedHonoContext: unknown = null;

    const route = t.get("/escape-hatch").handler(({ ctx }) => {
      capturedHonoContext = ctx.context;
      return json({ ok: true });
    });

    const app = createTaserApp({
      routes: {
        "/escape-hatch": {
          GET: {
            route,
          },
        },
      },
    });

    const res = await app.request("/escape-hatch");
    expect(res.status).toBe(200);
    expect(capturedHonoContext).toBeDefined();
    expect(typeof (capturedHonoContext as { req?: unknown }).req).toBe("object");
  });
});

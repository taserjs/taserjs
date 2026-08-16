import { Readable } from "node:stream";

import { createTaserApp, type RouteManifestShape } from "@taserjs/router";
import { createHelloApp, createStreamRoute, createTestRoute } from "./testing.js";
import { InvalidMountPatternError } from "@taserjs/router-utils";
import { reply } from "@taserjs/router-utils";
import { describe, expect, it, afterEach } from "vitest";
import Fastify from "fastify";

import { createFastifyHandler } from "../src/index.js";

describe("createFastifyHandler", () => {
  let app: ReturnType<typeof Fastify> | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("mounts with user pattern and forwards requests", async () => {
    app = Fastify();
    createFastifyHandler(createHelloApp()).mount("/*", app);
    await app.ready();

    const response = await app.inject({ method: "GET", url: "/hello" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  }, 15_000);

  it("prefixes routes at /api/*", async () => {
    app = Fastify();
    createFastifyHandler(createHelloApp()).mount("/api/*", app);
    await app.ready();

    const response = await app.inject({ method: "GET", url: "/api/hello" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it("rejects invalid mount patterns", () => {
    app = Fastify();
    expect(() => createFastifyHandler(createHelloApp()).mount("/", app)).toThrow(
      InvalidMountPatternError,
    );
    expect(() => createFastifyHandler(createHelloApp()).mount("/*splat", app)).toThrow(
      InvalidMountPatternError,
    );
  });

  it("streams response bodies end-to-end", async () => {
    const route = createStreamRoute(() =>
      Promise.resolve(reply.stream(Readable.from([Buffer.from("stream-ok")]))),
    );

    const manifest = {
      layouts: {},
      routes: {
        "/stream": {
          GET: { layoutChain: [], route },
        },
      },
    } satisfies RouteManifestShape;

    app = Fastify();
    createFastifyHandler(createTaserApp().context({}).create(manifest)).mount("/*", app);
    await app.ready();

    const response = await app.inject({ method: "GET", url: "/stream" });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("stream-ok");
  });

  it("registers a single route for /* mount", async () => {
    app = Fastify();
    createFastifyHandler(createHelloApp()).mount("/*", app);
    await app.ready();

    expect(app.printRoutes()).not.toContain("GET     /\n");
    const response = await app.inject({ method: "GET", url: "/hello" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it("matches exact mount prefix at /api", async () => {
    const route = createTestRoute("/", () => Promise.resolve(reply.json({ atRoot: true })));
    const manifest = {
      layouts: {},
      routes: {
        "/": {
          GET: { layoutChain: [], route },
        },
      },
    } satisfies RouteManifestShape;

    app = Fastify();
    createFastifyHandler(createTaserApp().context({}).create(manifest)).mount("/api/*", app);
    await app.ready();

    const response = await app.inject({ method: "GET", url: "/api" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ atRoot: true });
  });
});

import { createServer, type Server } from "node:http";
import { Readable } from "node:stream";

import { createTaserApp, type RouteManifestShape } from "@taserjs/router";
import { createHelloApp, createStreamRoute, createTestLayout } from "./testing.js";
import { InvalidMountPatternError } from "@taserjs/router-utils";
import { reply } from "@taserjs/router-utils";
import { describe, expect, it, afterEach } from "vitest";
import express from "express";

import { createExpressHandler } from "../src/index.js";

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected server to listen on a TCP port");
  }
  return address.port;
}

describe("createExpressHandler", () => {
  let server: Server | undefined;

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      if (!server) {
        resolve();
        return;
      }
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    server = undefined;
  });

  it("mounts with user pattern and forwards requests", async () => {
    const expressApp = express();
    createExpressHandler(createHelloApp()).mount("/*splat", expressApp);

    server = createServer(expressApp);
    const port = await listen(server);

    const response = await fetch(`http://127.0.0.1:${port}/hello`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("forwards GET / when mounted with /{*splat}", async () => {
    const layout = createTestLayout("root");
    const route = {
      path: "/",
      method: "GET" as const,
      middlewares: [],
      handlerMiddlewares: [],
      handler: () => Promise.resolve(reply.json({ root: true })),
    };

    const manifest = {
      layouts: {
        root: { middlewares: layout },
      },
      routes: {
        "/": {
          GET: { layoutChain: ["root"], route },
        },
      },
    } satisfies RouteManifestShape;

    const expressApp = express();
    createExpressHandler(createTaserApp().context({}).create(manifest)).mount(
      "/{*splat}",
      expressApp,
    );

    server = createServer(expressApp);
    const port = await listen(server);

    const response = await fetch(`http://127.0.0.1:${port}/`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ root: true });
  });

  it("rejects exact mount paths via core validation", () => {
    const expressApp = express();
    expect(() => createExpressHandler(createHelloApp()).mount("/", expressApp)).toThrow(
      InvalidMountPatternError,
    );
  });

  it("prefixes routes at /api/{*splat}", async () => {
    const expressApp = express();
    createExpressHandler(createHelloApp({ basePath: "/api" })).mount("/api/{*splat}", expressApp);

    server = createServer(expressApp);
    const port = await listen(server);

    const response = await fetch(`http://127.0.0.1:${port}/api/hello`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("streams response bodies end-to-end", async () => {
    const layout = createTestLayout("root");
    const route = createStreamRoute(() =>
      Promise.resolve(reply.stream(Readable.from([Buffer.from("stream-ok")]))),
    );

    const manifest = {
      layouts: {
        root: { middlewares: layout },
      },
      routes: {
        "/stream": {
          GET: { layoutChain: ["root"], route },
        },
      },
    } satisfies RouteManifestShape;

    const expressApp = express();
    createExpressHandler(createTaserApp().context({}).create(manifest)).mount(
      "/{*splat}",
      expressApp,
    );

    server = createServer(expressApp);
    const port = await listen(server);

    const response = await fetch(`http://127.0.0.1:${port}/stream`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("stream-ok");
  });

  it("returns 500 when the handler throws", async () => {
    const route = {
      path: "/boom",
      method: "GET" as const,
      middlewares: [],
      handlerMiddlewares: [],
      handler: () => {
        throw new Error("boom");
      },
    };

    const manifest = {
      layouts: {},
      routes: {
        "/boom": {
          GET: { layoutChain: [], route },
        },
      },
    } satisfies RouteManifestShape;

    const expressApp = express();
    createExpressHandler(createTaserApp().context({}).create(manifest)).mount(
      "/{*splat}",
      expressApp,
    );

    server = createServer(expressApp);
    const port = await listen(server);

    const response = await fetch(`http://127.0.0.1:${port}/boom`);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal Server Error" });
  });

  it("routes handler errors through onError when configured", async () => {
    const route = {
      path: "/boom",
      method: "GET" as const,
      middlewares: [],
      handlerMiddlewares: [],
      handler: () => {
        throw new Error("boom");
      },
    };

    const manifest = {
      layouts: {},
      routes: {
        "/boom": {
          GET: { layoutChain: [], route },
        },
      },
    } satisfies RouteManifestShape;

    const expressApp = express();
    createExpressHandler(
      createTaserApp()
        .onError(() => reply.internalServerError({ message: "express-handled" }))
        .context({})
        .create(manifest),
    ).mount("/{*splat}", expressApp);

    server = createServer(expressApp);
    const port = await listen(server);

    const response = await fetch(`http://127.0.0.1:${port}/boom`);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "express-handled" });
  });
});

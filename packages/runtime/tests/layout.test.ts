import { describe, it, expect } from "vitest";
import { isRouteManifestEntry, resolveMiddlewares, resolveMiddleware } from "../src/layout.js";
import type {
  LayoutDefinition,
  MiddlewareDefinition,
  MiddlewareHandler,
  RouteDefinition,
  RouteManifest,
} from "../src/types.js";

describe("Layout resolver (packages/runtime/src/layout.ts)", () => {
  it("checks route manifest entry shape with isRouteManifestEntry", () => {
    const route: RouteDefinition = {
      kind: "route",
      method: "GET",
      path: "/test",
      handler: async () => new Response("ok"),
    };

    expect(isRouteManifestEntry(route)).toBe(false);
    expect(isRouteManifestEntry({ route })).toBe(true);
    expect(isRouteManifestEntry({ route, layouts: ["/*"] })).toBe(true);
  });

  it("resolves cascading layout middlewares and route-level middlewares", () => {
    const mwRoot: MiddlewareHandler = async (_args, next) => next();
    const mwAdmin: MiddlewareHandler = async (_args, next) => next();
    const mwRoute: MiddlewareHandler = async (_args, next) => next();

    const rootLayout: LayoutDefinition = {
      kind: "layout",
      path: "/*",
      middlewares: [{ kind: "middleware", handler: mwRoot }],
    };

    const adminLayout: LayoutDefinition = {
      kind: "layout",
      path: "/admin/*",
      middlewares: [{ kind: "middleware", handler: mwAdmin }],
    };

    const manifest: RouteManifest = {
      layouts: {
        "/*": rootLayout,
        "/admin/*": adminLayout,
      },
      routes: {},
    };

    const routeDef: RouteDefinition = {
      kind: "route",
      method: "GET",
      path: "/admin/dashboard",
      middlewares: [{ kind: "middleware", handler: mwRoute }],
      handler: async () => new Response("ok"),
    };

    const middlewares = resolveMiddlewares(
      {
        layouts: ["/*", "/admin/*"],
        route: routeDef,
      },
      manifest,
    );

    expect(middlewares).toEqual([mwRoot, mwAdmin, mwRoute]);
  });

  it("resolves layout middlewares containing schema definitions", () => {
    const mwRoot: MiddlewareHandler = async (_args, next) => next();

    const rootLayout: LayoutDefinition = {
      kind: "layout",
      path: "/*",
      middlewares: [
        {
          kind: "middleware",
          handler: mwRoot,
          schemas: {
            query: {
              "~standard": {
                version: 1,
                vendor: "test",
                validate: (v: unknown) => ({ value: v }),
              },
            },
          },
        },
      ],
    };

    const manifest: RouteManifest = {
      layouts: {
        "/*": rootLayout,
      },
      routes: {},
    };

    const routeDef: RouteDefinition = {
      kind: "route",
      method: "GET",
      path: "/test",
      handler: async () => new Response("ok"),
    };

    const middlewares = resolveMiddlewares(
      {
        layouts: ["/*"],
        route: routeDef,
      },
      manifest,
    );

    expect(middlewares).toHaveLength(1);
    expect(typeof middlewares[0]).toBe("function");
  });

  it("resolves MiddlewareDefinition with schemas into validation middleware + handler", () => {
    const fn: MiddlewareHandler = async (_args, next) => next();
    const mwDef: MiddlewareDefinition = {
      kind: "middleware",
      handler: fn,
      schemas: {
        query: {
          "~standard": {
            version: 1 as const,
            vendor: "test",
            validate: (v: unknown) => ({ value: v }),
          },
        },
      },
    };

    const routeDef: RouteDefinition = {
      kind: "route",
      method: "GET",
      path: "/test",
      middlewares: [mwDef],
      handler: async () => new Response("ok"),
    };

    const middlewares = resolveMiddlewares(routeDef, { routes: {} });
    expect(middlewares).toHaveLength(1);
    expect(typeof middlewares[0]).toBe("function");

    const resolved = resolveMiddleware(mwDef);
    expect(typeof resolved).toBe("function");
    expect(resolved).not.toBe(fn);

    const plainDef: MiddlewareDefinition = { kind: "middleware", handler: fn };
    expect(resolveMiddleware(plainDef)).toBe(fn);
  });
});

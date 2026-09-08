import { describe, it, expect } from "vitest";
import { extractMiddlewares, isRouteManifestEntry, resolveMiddlewares } from "../src/layout.js";
import type { MiddlewareHandler, RouteDefinition, RouteManifest } from "../src/types.js";

describe("Layout resolver (packages/runtime/src/layout.ts)", () => {
  it("extracts middlewares from raw function, layout object, and default export", () => {
    const fn: MiddlewareHandler = async (_args, next) => next();

    expect(extractMiddlewares(null)).toEqual([]);
    expect(extractMiddlewares(undefined)).toEqual([]);
    expect(extractMiddlewares(fn)).toEqual([fn]);
    expect(extractMiddlewares({ middlewares: [fn] })).toEqual([fn]);
    expect(extractMiddlewares({ default: { middlewares: [fn] } })).toEqual([fn]);
    expect(extractMiddlewares({ default: fn })).toEqual([fn]);
  });

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

    const manifest: RouteManifest = {
      layouts: {
        "/*": { middlewares: [mwRoot] },
        "/admin/*": { middlewares: [mwAdmin] },
      },
      routes: {},
    };

    const routeDef: RouteDefinition = {
      kind: "route",
      method: "GET",
      path: "/admin/dashboard",
      middlewares: [mwRoute],
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
});

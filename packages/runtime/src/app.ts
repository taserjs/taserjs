import { Hono } from "hono";
import type { Context } from "hono";
import { normalizeRoutePath } from "./normalize.js";
import { createPipeline } from "./pipeline.js";
import { createTaserRequest } from "./request.js";
import type {
  CreateTaserAppOptions,
  MiddlewareHandler,
  RouteDefinition,
  RouteManifest,
  RouteManifestEntry,
  TaserApp,
} from "./types.js";

function isRouteManifestEntry(
  value: RouteManifestEntry | RouteDefinition,
): value is RouteManifestEntry {
  return typeof value === "object" && value !== null && "route" in value;
}

function resolveMiddlewares(
  entryOrRoute: RouteManifestEntry | RouteDefinition,
  manifest: RouteManifest,
): MiddlewareHandler[] {
  const middlewares: MiddlewareHandler[] = [];

  if (isRouteManifestEntry(entryOrRoute)) {
    const layoutRefs = entryOrRoute.layouts ?? [];
    for (const layoutRef of layoutRefs) {
      let layoutObj: unknown = layoutRef;
      if (typeof layoutRef === "string") {
        layoutObj = manifest.layouts?.[layoutRef];
      }

      if (!layoutObj) continue;

      if (typeof layoutObj === "object" && layoutObj !== null && "default" in layoutObj) {
        layoutObj = (layoutObj as { default: unknown }).default;
      }

      if (
        typeof layoutObj === "object" &&
        layoutObj !== null &&
        "middlewares" in layoutObj &&
        Array.isArray((layoutObj as { middlewares: unknown }).middlewares)
      ) {
        for (const mw of (layoutObj as { middlewares: unknown[] }).middlewares) {
          if (typeof mw === "function") {
            middlewares.push(mw as MiddlewareHandler);
          }
        }
      } else if (typeof layoutObj === "function") {
        middlewares.push(layoutObj as MiddlewareHandler);
      }
    }
  }

  const routeDef = isRouteManifestEntry(entryOrRoute) ? entryOrRoute.route : entryOrRoute;
  if (routeDef.middlewares && Array.isArray(routeDef.middlewares)) {
    for (const mw of routeDef.middlewares) {
      if (typeof mw === "function") {
        middlewares.push(mw as MiddlewareHandler);
      }
    }
  }

  return middlewares;
}

export function createTaserApp(manifest: RouteManifest, options?: CreateTaserAppOptions): TaserApp {
  const app = new Hono();
  const basePath = options?.basePath ? normalizeRoutePath(options.basePath) : "";
  const contextDef = options?.context;

  let bootPromise: Promise<Record<string, unknown>> | null = null;
  let bootResult: Record<string, unknown> | null = null;

  const getBoot = async (): Promise<Record<string, unknown>> => {
    if (bootResult) return bootResult;
    if (!contextDef?.boot) {
      bootResult = {};
      return bootResult;
    }
    if (!bootPromise) {
      bootPromise = (async () => {
        const res = await contextDef.boot!();
        bootResult = res ?? {};
        return bootResult;
      })();
    }
    return await bootPromise;
  };

  if (contextDef?.boot) {
    getBoot().catch(() => {});
  }

  for (const [routePath, methods] of Object.entries(manifest.routes)) {
    for (const [methodKey, entryOrRoute] of Object.entries(methods)) {
      const routeDefinition: RouteDefinition = isRouteManifestEntry(entryOrRoute)
        ? entryOrRoute.route
        : entryOrRoute;

      const method = (routeDefinition.method || methodKey).toUpperCase();
      const targetPath = routeDefinition.path || routePath;
      const rawCombinedPath = basePath ? `${basePath}/${targetPath}` : targetPath;
      const normalizedPath = normalizeRoutePath(rawCombinedPath);

      const middlewares = resolveMiddlewares(entryOrRoute, manifest);
      const pipeline = createPipeline(middlewares, routeDefinition.handler);

      app.on(method, normalizedPath, async (c: Context) => {
        const req = createTaserRequest(c);
        const bootData = await getBoot();
        const reqData = contextDef?.request ? await contextDef.request(req) : {};
        const ctx: Record<string, unknown> = {
          ...bootData,
          ...reqData,
          context: c,
        };

        return await pipeline(req, ctx);
      });
    }
  }

  return app;
}

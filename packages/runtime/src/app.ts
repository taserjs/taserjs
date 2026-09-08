import { Hono } from "hono";
import type { Context } from "hono";
import { normalizeRoutePath } from "./normalize.js";
import type {
  CreateTaserAppOptions,
  RouteDefinition,
  RouteManifest,
  RouteManifestEntry,
  TaserApp,
  TaserRequest,
} from "./types.js";

function isRouteManifestEntry(
  value: RouteManifestEntry | RouteDefinition,
): value is RouteManifestEntry {
  return typeof value === "object" && value !== null && "route" in value;
}

export function createTaserApp(manifest: RouteManifest, options?: CreateTaserAppOptions): TaserApp {
  const app = new Hono();
  const basePath = options?.basePath ? normalizeRoutePath(options.basePath) : "";

  for (const [routePath, methods] of Object.entries(manifest.routes)) {
    for (const [methodKey, entryOrRoute] of Object.entries(methods)) {
      const routeDefinition: RouteDefinition = isRouteManifestEntry(entryOrRoute)
        ? entryOrRoute.route
        : entryOrRoute;

      const method = (routeDefinition.method || methodKey).toUpperCase();
      const targetPath = routeDefinition.path || routePath;
      const rawCombinedPath = basePath ? `${basePath}/${targetPath}` : targetPath;
      const normalizedPath = normalizeRoutePath(rawCombinedPath);

      app.on(method, normalizedPath, async (c: Context) => {
        const req: TaserRequest = {
          params: c.req.param() ?? {},
          query: c.req.query() ?? {},
          headers: c.req.raw.headers,
          method: c.req.method,
          url: c.req.url,
          raw: c.req.raw,
        };

        const ctx: Record<string, unknown> = {
          context: c,
        };

        const state: Record<string, unknown> = {};

        return await routeDefinition.handler({ req, ctx, state });
      });
    }
  }

  return app;
}

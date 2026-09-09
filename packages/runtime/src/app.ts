import { Hono } from "hono";
import type { Context } from "hono";
import { UnsupportedMediaTypeError, ValidationError } from "@taserjs/utils";
import { createBootManager } from "./context.js";
import { isRouteManifestEntry, resolveMiddlewares } from "./layout.js";
import { normalizeRoutePath } from "./normalize.js";
import { createPipeline } from "./pipeline.js";
import { createTaserRequest } from "./request.js";
import type { CreateTaserAppOptions, RouteDefinition, RouteManifest, TaserApp } from "./types.js";

export function createTaserApp(manifest: RouteManifest, options?: CreateTaserAppOptions): TaserApp {
  const app = new Hono();
  const basePath = options?.basePath ? normalizeRoutePath(options.basePath) : "";
  const contextDef = options?.context;
  const bootManager = createBootManager(contextDef);

  app.onError((err: unknown, c: Context) => {
    if (err instanceof ValidationError) {
      return c.json({ errors: err.issues }, 422);
    }

    if (err instanceof UnsupportedMediaTypeError) {
      return c.json({ message: err.message || "Unsupported Media Type" }, 415);
    }

    if (err instanceof Response) {
      return err;
    }

    return c.text((err as Error)?.message || "Internal Server Error", 500);
  });

  for (const [routePath, methods] of Object.entries(manifest.routes)) {
    for (const [methodKey, entryOrRoute] of Object.entries(methods)) {
      const routeDefinition: RouteDefinition = isRouteManifestEntry(entryOrRoute)
        ? entryOrRoute.route
        : entryOrRoute;

      const method = (routeDefinition.method || methodKey).toUpperCase();
      const targetPath = routeDefinition.path || routePath;
      let finalPath = targetPath;
      if (basePath) {
        const cleanBase = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
        const cleanTarget = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;
        finalPath = cleanTarget === "/" ? cleanBase || "/" : `${cleanBase}${cleanTarget}`;
      }

      const middlewares = resolveMiddlewares(entryOrRoute, manifest);
      const pipeline = createPipeline(
        middlewares,
        routeDefinition.handler,
        routeDefinition.schemas,
      );

      app.on(method, finalPath, async (c: Context) => {
        const req = createTaserRequest(c);
        const bootData = await bootManager.getBoot();
        const reqData = contextDef?.request ? await contextDef.request(req) : {};
        const ctx: Record<string, unknown> = {
          ...bootData,
          ...reqData,
          context: c,
        };

        const res = await pipeline(req, ctx);
        return res;
      });
    }
  }

  return app;
}

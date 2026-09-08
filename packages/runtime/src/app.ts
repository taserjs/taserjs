import { Hono } from "hono";
import type { Context } from "hono";
import { UnsupportedMediaTypeError, ValidationError } from "@taserjs/utils";
import { createBootManager } from "./context.js";
import { isRouteManifestEntry, resolveMiddlewares } from "./layout.js";
import { normalizeRoutePath } from "./normalize.js";
import { createPipeline } from "./pipeline.js";
import { createTaserRequest } from "./request.js";
import type {
  CreateTaserAppOptions,
  RouteDefinition,
  RouteManifest,
  TaserApp,
} from "./types.js";

export function createTaserApp(manifest: RouteManifest, options?: CreateTaserAppOptions): TaserApp {
  const app = new Hono();
  const basePath = options?.basePath ? normalizeRoutePath(options.basePath) : "";
  const contextDef = options?.context;
  const bootManager = createBootManager(contextDef);

  app.onError((err: unknown, c: Context) => {
    if (
      err instanceof ValidationError ||
      (err && typeof err === "object" && (err as { name?: string }).name === "ValidationError")
    ) {
      const valErr = err as ValidationError;
      return c.json({ errors: valErr.issues }, 422);
    }

    if (
      err instanceof UnsupportedMediaTypeError ||
      (err &&
        typeof err === "object" &&
        ((err as { name?: string }).name === "UnsupportedMediaTypeError" ||
          (err as { status?: number }).status === 415))
    ) {
      const mediaErr = err as UnsupportedMediaTypeError;
      return c.json({ message: mediaErr.message || "Unsupported Media Type" }, 415);
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
      const rawCombinedPath = basePath ? `${basePath}/${targetPath}` : targetPath;
      const normalizedPath = normalizeRoutePath(rawCombinedPath);

      const middlewares = resolveMiddlewares(entryOrRoute, manifest);
      const pipeline = createPipeline(middlewares, routeDefinition.handler, routeDefinition.schemas);

      app.on(method, normalizedPath, async (c: Context) => {
        const req = createTaserRequest(c);
        const bootData = await bootManager.getBoot();
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

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
  TaserAppDefinition,
} from "./types.js";

export function createTaserApp(
  manifest: RouteManifest,
  taserOrOptions?: TaserAppDefinition,
): TaserApp {
  const app = new Hono();

  const options = (
    taserOrOptions &&
    typeof taserOrOptions === "object" &&
    "options" in taserOrOptions &&
    typeof (taserOrOptions as { options?: unknown }).options === "object"
      ? (taserOrOptions as { options: CreateTaserAppOptions }).options
      : taserOrOptions
  ) as CreateTaserAppOptions | undefined;

  const basePath = options?.basePath ? normalizeRoutePath(options.basePath) : "";
  const contextDef = options?.context;
  const customNotFound = options?.notFound;
  const customOnError = options?.onError;
  const bootManager = createBootManager(contextDef);

  app.onError(async (err: unknown, c: Context) => {
    if (err instanceof ValidationError) {
      return c.json({ errors: err.issues }, 422);
    }

    if (err instanceof UnsupportedMediaTypeError) {
      return c.json({ message: err.message || "Unsupported Media Type" }, 415);
    }

    if (err instanceof Response) {
      return err;
    }

    if (customOnError) {
      const req = createTaserRequest(c);
      return await customOnError(err, req);
    }

    return c.text((err as Error)?.message || "Internal Server Error", 500);
  });

  if (customNotFound) {
    app.notFound(async (c: Context) => {
      const req = createTaserRequest(c);
      const bootData = await bootManager.getBoot();
      const reqData = contextDef?.request ? await contextDef.request(req) : {};
      const ctx: Record<string, unknown> = {
        ...bootData,
        ...reqData,
        context: c,
      };

      return await customNotFound({ req, ctx });
    });
  }

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
        try {
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
        } catch (err) {
          if (err instanceof Response) {
            return err;
          }
          throw err;
        }
      });
    }
  }

  return app;
}

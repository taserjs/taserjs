import { Hono } from "hono";
import type { Context } from "hono";
import { UnsupportedMediaTypeError, ValidationError } from "@taserjs/utils";
import { createBootManager } from "./context.js";
import { resolveMiddlewares } from "./layout.js";
import { createPipeline } from "./pipeline.js";
import { createTaserRequest, isStaticRoutePath } from "./request.js";
import type { RouteManifest, TaserApp, TaserDefinition, TaserRequest } from "./types.js";

function catchResponse(err: unknown): Response {
  if (err instanceof Response) {
    return err;
  }
  throw err;
}

export function createTaserApp(manifest: RouteManifest, taser?: TaserDefinition<any>): TaserApp {
  const options = taser?.options;
  const app = options?.basePath ? new Hono().basePath(options.basePath) : new Hono();
  const contextDef = options?.context;
  const customNotFound = options?.notFound;
  const customOnError = options?.onError;
  const bootManager = createBootManager(contextDef);

  const hasContext = Boolean(contextDef);
  const hasRequestHook = Boolean(contextDef?.request);

  function resolveContextSync(c: Context): Record<string, unknown> | null {
    if (!hasContext) {
      return { context: c };
    }
    if (!hasRequestHook) {
      const boot = bootManager.getBootSync();
      if (boot) {
        return { ...boot, context: c };
      }
    }
    return null;
  }

  async function resolveContext(c: Context, req: TaserRequest): Promise<Record<string, unknown>> {
    const syncResult = resolveContextSync(c);
    if (syncResult) return syncResult;

    const bootData = bootManager.getBootSync() ?? (await bootManager.getBoot());
    const reqData = contextDef?.request ? await contextDef.request(req) : {};
    return {
      ...bootData,
      ...reqData,
      context: c,
    };
  }

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
      const ctx = resolveContextSync(c) ?? (await resolveContext(c, req));
      return await customNotFound({ req, ctx });
    });
  }

  for (const [routePath, methods] of Object.entries(manifest.routes)) {
    for (const [methodKey, entry] of Object.entries(methods)) {
      const routeDefinition = entry.route;
      const method = (routeDefinition.method || methodKey).toUpperCase();
      const targetPath = routeDefinition.path || routePath;
      const isStatic = isStaticRoutePath(targetPath);

      const middlewares = resolveMiddlewares(entry, manifest);
      const pipeline = createPipeline(
        middlewares,
        routeDefinition.handler,
        routeDefinition.schemas,
      );

      app.on(method, targetPath, (c: Context) => {
        try {
          const req = createTaserRequest(c, targetPath, isStatic);
          const syncCtx = resolveContextSync(c);
          if (syncCtx) {
            const res = pipeline(req, syncCtx);
            if (res instanceof Promise) {
              return res.catch(catchResponse);
            }
            return res;
          }

          return resolveContext(c, req)
            .then((asyncCtx) => pipeline(req, asyncCtx))
            .catch(catchResponse);
        } catch (err) {
          return catchResponse(err);
        }
      });
    }
  }

  return app;
}

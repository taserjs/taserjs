import { Hono } from "hono";
import type { Context } from "hono";
import {
  ResponseValidationError,
  UnsupportedMediaTypeError,
  ValidationError,
} from "@taserjs/utils";
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

    if (err instanceof ResponseValidationError) {
      return c.json(
        {
          message: "Response Validation Failed",
          status: err.status,
          issues: err.issues,
          data: err.data,
        },
        500,
      );
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
    const hasHead = Boolean(methods["HEAD"] || methods["head"]);
    const hasGet = Boolean(methods["GET"] || methods["get"]);
    const headEntry = methods["HEAD"] ?? methods["head"];

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
        options?.response,
      );

      // If this is a GET route and there is a dedicated HEAD route, prepare headPipeline for delegation
      let headPipeline:
        | ((req: TaserRequest, ctx: Record<string, unknown>) => Response | Promise<Response>)
        | undefined;
      if (method === "GET" && hasHead && headEntry) {
        const headMiddlewares = resolveMiddlewares(headEntry, manifest);
        headPipeline = createPipeline(
          headMiddlewares,
          headEntry.route.handler,
          headEntry.route.schemas,
          options?.response,
        );
      }

      const routeHandler = (c: Context) => {
        if (method === "HEAD" && c.req.method !== "HEAD") {
          return new Response("Method Not Allowed", { status: 405 });
        }
        try {
          const req = createTaserRequest(c, targetPath, isStatic);
          const activePipeline = c.req.method === "HEAD" && headPipeline ? headPipeline : pipeline;
          const syncCtx = resolveContextSync(c);
          if (syncCtx) {
            const res = activePipeline(req, syncCtx);
            if (res instanceof Promise) {
              return res.catch(catchResponse);
            }
            return res;
          }

          return resolveContext(c, req)
            .then((asyncCtx) => activePipeline(req, asyncCtx))
            .catch(catchResponse);
        } catch (err) {
          return catchResponse(err);
        }
      };

      if (method === "ALL") {
        app.all(targetPath, routeHandler);
      } else if (method === "ANY") {
        const methodsToMount =
          routeDefinition.methods && routeDefinition.methods.length > 0
            ? routeDefinition.methods.map((m) => m.toUpperCase())
            : ["GET", "POST", "PUT", "DELETE", "PATCH"];
        app.on(methodsToMount, targetPath, routeHandler);
      } else if (method === "HEAD") {
        if (!hasGet) {
          app.on(["HEAD", "GET"], targetPath, routeHandler);
        } else {
          app.on("HEAD", targetPath, routeHandler);
        }
      } else {
        app.on(method, targetPath, routeHandler);
      }
    }
  }

  return app;
}

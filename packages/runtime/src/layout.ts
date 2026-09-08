import type { Context } from "hono";
import type { RouteSchemas } from "@taserjs/router";
import { validateSchemas } from "./pipeline.js";
import type {
  MiddlewareHandler,
  RouteDefinition,
  RouteManifest,
  RouteManifestEntry,
} from "./types.js";

export function isRouteManifestEntry(
  value: RouteManifestEntry | RouteDefinition,
): value is RouteManifestEntry {
  return typeof value === "object" && value !== null && "route" in value;
}

export function hasSchemas(schemas?: RouteSchemas | undefined): boolean {
  return Boolean(schemas && (schemas.headers || schemas.params || schemas.query || schemas.body));
}

export function createSchemaValidationMiddleware(schemas: RouteSchemas): MiddlewareHandler {
  return async ({ req, ctx }, next) => {
    const honoContext = ctx.context as Context | undefined;
    await validateSchemas(schemas, req, honoContext);
    return await next();
  };
}

export function extractMiddlewares(raw: unknown): MiddlewareHandler[] {
  if (!raw) return [];

  const target =
    typeof raw === "object" && raw !== null && "default" in raw
      ? (raw as { default: unknown }).default
      : raw;

  if (typeof target === "function") {
    return [target as MiddlewareHandler];
  }

  if (typeof target === "object" && target !== null && "middlewares" in target) {
    const mws = (target as { middlewares: unknown }).middlewares;
    if (Array.isArray(mws)) {
      const result: MiddlewareHandler[] = [];
      for (const mw of mws) {
        if (typeof mw === "function") {
          result.push(mw);
        } else if (mw && typeof mw === "object" && typeof (mw as { handler: unknown }).handler === "function") {
          const candidate = mw as { handler: MiddlewareHandler; schemas?: RouteSchemas };
          if (hasSchemas(candidate.schemas)) {
            const schemas = candidate.schemas!;
            const handler = candidate.handler;
            result.push(async (args, next) => {
              const honoContext = args.ctx.context as Context | undefined;
              await validateSchemas(schemas, args.req, honoContext);
              return await handler(args, next);
            });
          } else {
            result.push(candidate.handler);
          }
        }
      }
      return result;
    }
  }

  return [];
}

export function resolveMiddlewares(
  entryOrRoute: RouteManifestEntry | RouteDefinition,
  manifest: RouteManifest,
): MiddlewareHandler[] {
  const middlewares: MiddlewareHandler[] = [];

  if (isRouteManifestEntry(entryOrRoute)) {
    const layoutRefs = entryOrRoute.layouts ?? [];
    for (const layoutRef of layoutRefs) {
      const layoutObj =
        typeof layoutRef === "string" ? manifest.layouts?.[layoutRef] : layoutRef;

      const target =
        typeof layoutObj === "object" && layoutObj !== null && "default" in layoutObj
          ? (layoutObj as { default: unknown }).default
          : layoutObj;

      if (typeof target === "object" && target !== null && "schemas" in target) {
        const schemas = (target as { schemas?: RouteSchemas }).schemas;
        if (hasSchemas(schemas)) {
          middlewares.push(createSchemaValidationMiddleware(schemas!));
        }
      }

      middlewares.push(...extractMiddlewares(layoutObj));
    }
  }

  const routeDef = isRouteManifestEntry(entryOrRoute) ? entryOrRoute.route : entryOrRoute;
  if (routeDef.middlewares && Array.isArray(routeDef.middlewares)) {
    middlewares.push(...extractMiddlewares({ middlewares: routeDef.middlewares }));
  }

  return middlewares;
}

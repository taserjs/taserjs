import type { Context } from "hono";
import type { RouteSchemas } from "@taserjs/router";
import { validateSchemas } from "./pipeline.js";
import type {
  LayoutDefinition,
  MiddlewareDefinition,
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
  return Boolean(schemas && (schemas.params || schemas.query || schemas.body));
}

export function resolveMiddleware(mw: MiddlewareDefinition): MiddlewareHandler {
  if (hasSchemas(mw.schemas)) {
    const schemas = mw.schemas!;
    const handler = mw.handler;
    return async (args, next) => {
      const honoContext = args.ctx.context as Context | undefined;
      await validateSchemas(schemas, args.req, honoContext);
      return await handler(args, next);
    };
  }

  return mw.handler;
}

export const normalizeMiddleware = resolveMiddleware;

export function resolveMiddlewares(
  entryOrRoute: RouteManifestEntry | RouteDefinition,
  manifest: RouteManifest,
): MiddlewareHandler[] {
  const middlewares: MiddlewareHandler[] = [];
  const entry: RouteManifestEntry = isRouteManifestEntry(entryOrRoute)
    ? entryOrRoute
    : { route: entryOrRoute };

  if (entry.layouts) {
    for (const layoutRef of entry.layouts) {
      const layout: LayoutDefinition | undefined =
        typeof layoutRef === "string" ? manifest.layouts?.[layoutRef] : layoutRef;

      if (!layout) continue;

      if (layout.middlewares) {
        for (const mw of layout.middlewares) {
          middlewares.push(resolveMiddleware(mw));
        }
      }
    }
  }

  if (entry.route.middlewares) {
    for (const mw of entry.route.middlewares) {
      middlewares.push(resolveMiddleware(mw));
    }
  }

  return middlewares;
}

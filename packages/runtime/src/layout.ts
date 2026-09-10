import type { Context } from "hono";
import { hasSchemas, validateSchemas } from "./pipeline.js";
import type {
  MiddlewareDefinition,
  MiddlewareHandler,
  RouteManifest,
  RouteManifestEntry,
} from "./types.js";

export { hasSchemas };

export function resolveMiddleware(mw: MiddlewareDefinition): MiddlewareHandler {
  if (hasSchemas(mw.schemas)) {
    const schemas = mw.schemas!;
    const handler = mw.handler;
    return async (args, next) => {
      const honoContext = (args.ctx as Record<string, unknown>).context as Context | undefined;
      await validateSchemas(schemas, args.req, honoContext);
      return await handler(args, next);
    };
  }

  return mw.handler;
}

export const normalizeMiddleware = resolveMiddleware;

export function resolveMiddlewares(
  entry: RouteManifestEntry,
  manifest: RouteManifest,
): MiddlewareHandler[] {
  const middlewares: MiddlewareHandler[] = [];

  if (entry.layouts) {
    for (const layoutId of entry.layouts) {
      const layout = manifest.layouts?.[layoutId];
      if (!layout?.middlewares) continue;

      for (const mw of layout.middlewares) {
        middlewares.push(resolveMiddleware(mw));
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

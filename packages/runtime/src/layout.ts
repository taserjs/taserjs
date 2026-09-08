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
      return mws.filter((mw): mw is MiddlewareHandler => typeof mw === "function");
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
      middlewares.push(...extractMiddlewares(layoutObj));
    }
  }

  const routeDef = isRouteManifestEntry(entryOrRoute) ? entryOrRoute.route : entryOrRoute;
  if (routeDef.middlewares && Array.isArray(routeDef.middlewares)) {
    for (const mw of routeDef.middlewares) {
      if (typeof mw === "function") {
        middlewares.push(mw);
      }
    }
  }

  return middlewares;
}

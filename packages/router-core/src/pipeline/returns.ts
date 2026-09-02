import type { StandardSchemaV1 } from "@standard-schema/spec";
import { collectReturnsFromDefinitions, mergeReturnsMaps } from "@taserjs/router-utils";

import type { MiddlewareDefinition, RouteHandler, RouteManifestShape } from "../types.js";

export function getMiddlewares(value: unknown): readonly MiddlewareDefinition[] {
  if (typeof value === "object" && value !== null && "middlewares" in value) {
    const inner = (value as { middlewares: unknown }).middlewares;
    if (Array.isArray(inner)) {
      return inner as readonly MiddlewareDefinition[];
    }
    if (typeof inner === "object" && inner !== null && "middlewares" in inner) {
      const nested = (inner as { middlewares: unknown }).middlewares;
      if (Array.isArray(nested)) {
        return nested as readonly MiddlewareDefinition[];
      }
    }
  }
  return [];
}

export function buildEffectiveReturns(
  manifest: RouteManifestShape,
  layouts: readonly string[],
  route: RouteHandler,
): Record<number, StandardSchemaV1> | undefined {
  const layoutMaps: Array<Record<number, StandardSchemaV1>> = [];
  for (const layoutId of layouts) {
    const layout = manifest.layouts[layoutId];
    if (!layout) {
      continue;
    }
    layoutMaps.push(collectReturnsFromDefinitions(getMiddlewares(layout)));
  }

  const maps: Array<Record<number, StandardSchemaV1> | undefined> = [
    ...layoutMaps,
    route.returns as Record<number, StandardSchemaV1> | undefined,
  ];
  const merged = mergeReturnsMaps(...maps);
  return Object.keys(merged).length > 0 ? merged : undefined;
}

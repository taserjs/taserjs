import type { StandardSchemaV1 } from '@standard-schema/spec'
import { collectReturnsFromDefinitions, mergeReturnsMaps } from '@taserjs/router-utils'

import type { MiddlewareChain, MiddlewareDefinition, RouteHandler, RouteManifestShape } from '../types.js'

export function getMiddlewares(value: unknown): readonly MiddlewareDefinition[] {
  if (
    typeof value === 'object'
    && value !== null
    && 'middlewares' in value
    && Array.isArray((value as MiddlewareChain).middlewares)
  ) {
    return (value as MiddlewareChain).middlewares
  }
  return []
}

export function buildEffectiveReturns(
  manifest: RouteManifestShape,
  layoutChain: readonly string[],
  route: RouteHandler,
): Record<number, StandardSchemaV1> | undefined {
  const layoutMaps: Array<Record<number, StandardSchemaV1>> = []
  for (const layoutId of layoutChain) {
    const layout = manifest.layouts[layoutId]
    if (!layout) {
      continue
    }
    layoutMaps.push(collectReturnsFromDefinitions(getMiddlewares(layout.middlewares)))
  }

  const maps: Array<Record<number, StandardSchemaV1> | undefined> = [
    ...layoutMaps,
    route.returns as Record<number, StandardSchemaV1> | undefined,
  ]
  const merged = mergeReturnsMaps(...maps)
  return Object.keys(merged).length > 0 ? merged : undefined
}

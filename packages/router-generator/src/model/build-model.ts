import { HTTP_VERBS } from '../constants.js'
import type { GeneratedModel, RouteEntry, RouteMethodEntry, ScanResult } from '../types/index.js'
import type { HttpVerb } from '../types/http.js'
import { isHttpVerb } from '../scan/classify.js'
import { layoutParentId } from './layout-tree.js'

function expandRoutesByPath(routes: RouteEntry[]): Map<string, RouteMethodEntry[]> {
  const byPath = new Map<string, RouteEntry[]>()

  for (const route of routes) {
    const list = byPath.get(route.urlPath) ?? []
    list.push(route)
    byPath.set(route.urlPath, list)
  }

  const routesByPath = new Map<string, RouteMethodEntry[]>()

  for (const [urlPath, pathRoutes] of byPath) {
    const filled = new Map<HttpVerb, RouteMethodEntry>()

    const specifics = pathRoutes.filter(
      (route): route is RouteEntry & { method: HttpVerb } => isHttpVerb(route.method),
    )
    for (const route of specifics) {
      filled.set(route.method, {
        method: route.method,
        parentLayout: route.parentLayout,
        importName: route.importName,
        routeRel: route.routeRel,
        layoutChain: route.layoutChain,
      })
    }

    const anyRoute = pathRoutes.find(route => route.method === 'ANY')
    if (anyRoute) {
      for (const method of anyRoute.anyMethods ?? []) {
        if (filled.has(method)) {
          continue
        }
        filled.set(method, {
          method,
          parentLayout: anyRoute.parentLayout,
          importName: anyRoute.importName,
          routeRel: anyRoute.routeRel,
          layoutChain: anyRoute.layoutChain,
        })
      }
    }

    const allRoute = pathRoutes.find(route => route.method === 'ALL')
    if (allRoute) {
      for (const method of HTTP_VERBS) {
        if (filled.has(method)) {
          continue
        }
        filled.set(method, {
          method,
          parentLayout: allRoute.parentLayout,
          importName: allRoute.importName,
          routeRel: allRoute.routeRel,
          layoutChain: allRoute.layoutChain,
        })
      }
    }

    routesByPath.set(
      urlPath,
      [...filled.values()].sort((left, right) => left.method.localeCompare(right.method)),
    )
  }

  return routesByPath
}

function assembleGeneratedModel(scan: ScanResult): GeneratedModel {
  const layoutIds = scan.layouts.map(layout => layout.id)
  const layoutIdSet = new Set(layoutIds)
  const layoutParents = new Map(
    layoutIds.map(layoutId => [layoutId, layoutParentId(layoutId, layoutIdSet)]),
  )

  const routesByPath = expandRoutesByPath(scan.routes)
  const routePaths = [...routesByPath.keys()].sort()

  return {
    layouts: scan.layouts,
    routes: scan.routes,
    layoutIds,
    layoutParents,
    routePaths,
    routesByPath,
  }
}

export function buildGeneratedModelFromScan(scan: ScanResult): GeneratedModel {
  return assembleGeneratedModel(scan)
}

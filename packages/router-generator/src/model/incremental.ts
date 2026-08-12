import type { GeneratedModel, LayoutFile, RouteEntry, ScanResult } from '../types/index.js'
import {
  isGlobalLayoutId,
  recomputeLayoutChainsForRoutes,
  routesAffectedByLayoutChange,
  scanRouteFiles,
  scanSingleRouteFile,
  type ScanOptions,
} from '../scan/scan-routes.js'
import { layoutIdFromPath } from '../support/naming.js'
import { normalizeRouteRel } from '../scan/normalize.js'
import { buildGeneratedModelFromScan } from './build-model.js'
import { routesImportPrefix } from '../support/paths.js'
import type { FileEntry } from '../fs/file-index.js'

export class IncrementalRouteModel {
  private layouts: LayoutFile[] = []
  private routes: RouteEntry[] = []
  private layoutById = new Map<string, LayoutFile>()
  private routeByRel = new Map<string, RouteEntry>()

  static async fromColdScan(
    routesDir: string,
    outputFile: string,
    absoluteFiles: string[],
    scanOptions: ScanOptions = {},
  ): Promise<IncrementalRouteModel> {
    const routesImportBase = routesImportPrefix(routesDir, outputFile)
    const scan = await scanRouteFiles(routesDir, routesImportBase, absoluteFiles, scanOptions)
    const model = new IncrementalRouteModel()
    model.replaceAll(scan)
    return model
  }

  replaceAll(scan: ScanResult): void {
    this.layouts = scan.layouts
    this.routes = scan.routes
    this.layoutById = new Map(scan.layouts.map(layout => [layout.id, layout]))
    this.routeByRel = new Map(scan.routes.map(route => [route.routeRel, route]))
  }

  toGeneratedModel(): GeneratedModel {
    return buildGeneratedModelFromScan({ layouts: this.layouts, routes: this.routes })
  }

  async applyFileUpsert(
    routesDir: string,
    outputFile: string,
    absolutePath: string,
    scanOptions: ScanOptions = {},
  ): Promise<'full' | 'partial' | 'none'> {
    const routesImportBase = routesImportPrefix(routesDir, outputFile)
    const parsed = await scanSingleRouteFile(routesDir, routesImportBase, absolutePath, scanOptions)

    if (!parsed) {
      return 'none'
    }

    if (parsed.kind === 'route') {
      this.routeByRel.set(parsed.entry.routeRel, parsed.entry)
      this.routes = [...this.routeByRel.values()].sort(compareRoutes)
      recomputeLayoutChainsForRoutes([parsed.entry], this.layouts)
      return 'partial'
    }

    const previousLayout = this.layoutById.get(parsed.entry.id)
    this.layoutById.set(parsed.entry.id, parsed.entry)
    this.layouts = [...this.layoutById.values()].sort((left, right) => left.id.localeCompare(right.id))

    if (!previousLayout || isGlobalLayoutId(parsed.entry.id)) {
      recomputeLayoutChainsForRoutes(this.routes, this.layouts)
      return 'full'
    }

    const affected = routesAffectedByLayoutChange(parsed.entry.id, this.routes)
    recomputeLayoutChainsForRoutes(affected, this.layouts)
    return 'partial'
  }

  applyFileRemoval(entry: FileEntry): 'full' | 'partial' | 'none' {
    if (entry.kind === 'route') {
      const routeRel = normalizeRouteRel(entry.relativePath)
      if (!this.routeByRel.has(routeRel)) {
        return 'none'
      }
      this.routeByRel.delete(routeRel)
      this.routes = [...this.routeByRel.values()].sort(compareRoutes)
      return 'partial'
    }

    const layoutId = layoutIdFromPath(normalizeRouteRel(entry.relativePath))
    if (!this.layoutById.has(layoutId)) {
      return 'none'
    }

    this.layoutById.delete(layoutId)
    this.layouts = [...this.layoutById.values()].sort((left, right) => left.id.localeCompare(right.id))

    if (isGlobalLayoutId(layoutId)) {
      recomputeLayoutChainsForRoutes(this.routes, this.layouts)
      return 'full'
    }

    const affected = routesAffectedByLayoutChange(layoutId, this.routes)
    recomputeLayoutChainsForRoutes(affected, this.layouts)
    return 'partial'
  }
}

function compareRoutes(left: RouteEntry, right: RouteEntry): number {
  const pathCompare = left.urlPath.localeCompare(right.urlPath)
  if (pathCompare !== 0) {
    return pathCompare
  }
  return left.method.localeCompare(right.method)
}

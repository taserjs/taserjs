import { relative } from "node:path";
import { readFile } from "node:fs/promises";

import type { ExtensionOption } from "../config/schema.js";
import type { RouteFileMethod } from "../types/http.js";
import type { LayoutFile, RouteEntry, ScanResult } from "../types/index.js";
import {
  getMethodFromRouteFile,
  isLayoutFile,
  isRouteFile,
  routePathWithoutVerb,
} from "./classify.js";
import { assertPhysicalRouteFile } from "./filter.js";
import { importPathFromRouteRel, layoutImportPathFromRouteRel } from "./imports.js";
import { normalizeRouteRel } from "./normalize.js";
import { buildUrlPath } from "./url-path.js";
import { layoutIdFromPath, layoutImportName, routeImportName } from "../support/naming.js";
import { layoutAppliesToRoute, routeLayoutChain } from "../model/layout-tree.js";
import { ScanError, ScanErrorCollection } from "../support/errors.js";
import { toPosixPath } from "../support/paths.js";
import { collectInvalidRouteParams, formatInvalidParamMessage } from "./validate-route-params.js";
import { analyzeLayoutFileSource, analyzeRouteFileSource } from "./parse-route-source.js";
import type { AnalysisCache } from "./analysis-cache.js";

export type ScanOptions = {
  extension?: ExtensionOption;
  validate?: boolean;
  ignorePrefix?: string | undefined;
  ignorePattern?: string | undefined;
  cache?: AnalysisCache | undefined;
};

function parseRouteEntry(
  rawRel: string,
  routesImportBase: string,
  extension: ExtensionOption,
  anyMethods?: RouteEntry["anyMethods"],
): RouteEntry {
  const routeRel = normalizeRouteRel(rawRel);
  const method = getMethodFromRouteFile(routeRel);

  const entry: RouteEntry = {
    routeRel,
    urlPath: buildUrlPath(routeRel),
    method,
    layoutChain: [],
    parentLayout: null,
    importName: routeImportName(routeRel, method),
    importPath: importPathFromRouteRel(rawRel, routesImportBase, extension),
  };

  if (anyMethods) {
    entry.anyMethods = anyMethods;
  }

  return entry;
}

function parseLayoutEntry(
  rawRel: string,
  routesImportBase: string,
  extension: ExtensionOption,
): LayoutFile {
  const id = layoutIdFromPath(normalizeRouteRel(rawRel));
  return {
    id,
    importPath: layoutImportPathFromRouteRel(rawRel, routesImportBase, extension),
    importName: layoutImportName(id),
  };
}

function validateDuplicateRoutes(routes: RouteEntry[]): ScanError[] {
  const errors: ScanError[] = [];
  const seen = new Map<string, string>();

  for (const route of routes) {
    const key = `${route.urlPath}:${route.method}`;
    const existing = seen.get(key);
    if (existing) {
      errors.push(
        new ScanError(
          `Duplicate route for ${route.method} ${route.urlPath} (${existing} and ${route.routeRel})`,
          route.routeRel,
        ),
      );
      continue;
    }
    seen.set(key, route.routeRel);
  }

  return errors;
}

type PendingFile = {
  absolutePath: string;
  rawRel: string;
  kind: "route" | "layout";
  method?: RouteFileMethod;
};

function classifyPending(
  absoluteFiles: string[],
  routesDir: string,
): {
  pending: PendingFile[];
  errors: ScanError[];
} {
  const pending: PendingFile[] = [];
  const errors: ScanError[] = [];

  for (const absolutePath of absoluteFiles) {
    const rawRel = toPosixPath(relative(routesDir, absolutePath));

    try {
      assertPhysicalRouteFile(rawRel);
      if (isRouteFile(rawRel)) {
        const method = getMethodFromRouteFile(normalizeRouteRel(rawRel));
        pending.push({ absolutePath, rawRel, kind: "route", method });
      } else if (isLayoutFile(rawRel)) {
        pending.push({ absolutePath, rawRel, kind: "layout" });
      }
    } catch (error) {
      if (error instanceof ScanError) {
        errors.push(error);
      } else {
        throw error;
      }
    }
  }

  return { pending, errors };
}

/**
 * Analyze all pending files concurrently. Reads and parses go through the
 * optional analysis cache; parsing itself runs on oxc's native worker pool,
 * so a cold scan no longer blocks the event loop per file.
 *
 * Error semantics preserved from the sequential implementation:
 * - validation errors are collected while the entry still participates
 * - an ANY file analyzed without validation contributes no entry on errors
 */
async function analyzePending(
  pending: PendingFile[],
  routesImportBase: string,
  extension: ExtensionOption,
  validate: boolean,
  cache: AnalysisCache | undefined,
): Promise<{
  layouts: LayoutFile[];
  routes: RouteEntry[];
  fileErrors: ScanError[];
}> {
  const layouts: LayoutFile[] = [];
  const routes: RouteEntry[] = [];
  const fileErrors: ScanError[] = [];

  await Promise.all(
    pending.map(async (file) => {
      if (file.kind === "route") {
        const method = file.method!;
        let anyMethods: RouteEntry["anyMethods"] | undefined;

        if (validate || method === "ANY") {
          let analysis;
          if (cache) {
            analysis = await cache.analyzeRoute(file.absolutePath, file.rawRel, method, {
              validate,
            });
          } else {
            const source = await readFile(file.absolutePath, "utf8").catch(() => undefined);
            if (source !== undefined) {
              analysis = await import("./parse-route-source.js").then((m) =>
                m.analyzeRouteFileSourceAsync(source, file.rawRel, method),
              );
            }
          }

          if (analysis) {
            if (method === "ANY" && !validate) {
              if (analysis.errors.length > 0) {
                fileErrors.push(...analysis.errors);
                return;
              }
            } else {
              fileErrors.push(...analysis.errors);
            }
            anyMethods = analysis.anyMethods;
          }
        }

        routes.push(parseRouteEntry(file.rawRel, routesImportBase, extension, anyMethods));
        return;
      }

      layouts.push(parseLayoutEntry(file.rawRel, routesImportBase, extension));

      if (validate) {
        let analysis;
        if (cache) {
          analysis = await cache.analyzeLayout(file.absolutePath, file.rawRel, { validate });
        } else {
          const source = await readFile(file.absolutePath, "utf8").catch(() => undefined);
          if (source !== undefined) {
            analysis = await import("./parse-route-source.js").then((m) =>
              m.analyzeLayoutFileSourceAsync(source, file.rawRel),
            );
          }
        }
        if (analysis) {
          fileErrors.push(...analysis.errors);
        }
      }
    }),
  );

  return { layouts, routes, fileErrors };
}

export async function scanRouteFiles(
  routesDir: string,
  routesImportBase: string,
  absoluteFiles: string[],
  options: ScanOptions = {},
): Promise<ScanResult> {
  const extension = options.extension ?? true;
  const validate = options.validate ?? true;

  const { pending, errors: classifyErrors } = classifyPending(absoluteFiles, routesDir);

  const { layouts, routes, fileErrors } = await analyzePending(
    pending,
    routesImportBase,
    extension,
    validate,
    options.cache,
  );

  const errors = [...classifyErrors, ...fileErrors];

  for (const route of routes) {
    for (const invalid of collectInvalidRouteParams(route.routeRel)) {
      errors.push(
        new ScanError(
          formatInvalidParamMessage(invalid.paramName, invalid.filePath),
          route.routeRel,
        ),
      );
    }
  }

  const seenLayoutIds = new Set<string>();
  for (const layout of layouts) {
    if (seenLayoutIds.has(layout.id)) {
      errors.push(new ScanError(`Duplicate layout id "${layout.id}"`, layout.id));
      continue;
    }
    seenLayoutIds.add(layout.id);
  }

  errors.push(...validateDuplicateRoutes(routes));

  if (errors.length > 0) {
    throw new ScanErrorCollection(errors);
  }

  return finalizeScanResult({ layouts, routes });
}

export async function scanSingleRouteFile(
  routesDir: string,
  routesImportBase: string,
  absolutePath: string,
  options: ScanOptions = {},
): Promise<{ kind: "route"; entry: RouteEntry } | { kind: "layout"; entry: LayoutFile } | null> {
  const extension = options.extension ?? true;
  const validate = options.validate ?? true;
  const rawRel = toPosixPath(relative(routesDir, absolutePath));
  assertPhysicalRouteFile(rawRel);

  if (isRouteFile(rawRel)) {
    const method = getMethodFromRouteFile(normalizeRouteRel(rawRel));
    const errors: ScanError[] = [];
    let anyMethods: RouteEntry["anyMethods"] | undefined;

    if (validate || method === "ANY") {
      const source = await readFile(absolutePath, "utf8").catch(() => undefined);
      if (source !== undefined) {
        const analyzed = analyzeRouteFileSource(source, rawRel, method);
        if (method === "ANY" && !validate && analyzed.errors.length > 0) {
          throw new ScanErrorCollection(analyzed.errors);
        }
        errors.push(...analyzed.errors);
        anyMethods = analyzed.anyMethods;
      }
    }

    const entry = parseRouteEntry(rawRel, routesImportBase, extension, anyMethods);

    for (const invalid of collectInvalidRouteParams(entry.routeRel)) {
      errors.push(
        new ScanError(formatInvalidParamMessage(invalid.paramName, invalid.filePath), rawRel),
      );
    }

    if (errors.length > 0) {
      throw new ScanErrorCollection(errors);
    }

    return { kind: "route", entry };
  }

  if (isLayoutFile(rawRel)) {
    const entry = parseLayoutEntry(rawRel, routesImportBase, extension);

    if (validate) {
      const source = await readFile(absolutePath, "utf8");
      const errors = analyzeLayoutFileSource(source, rawRel).errors;
      if (errors.length > 0) {
        throw new ScanErrorCollection(errors);
      }
    }

    return { kind: "layout", entry };
  }

  return null;
}

export function finalizeScanResult(scan: ScanResult): ScanResult {
  const layouts = [...scan.layouts].sort((left, right) => left.id.localeCompare(right.id));

  recomputeLayoutChainsForRoutes(scan.routes, layouts);

  scan.routes.sort((left, right) => {
    const pathCompare = left.urlPath.localeCompare(right.urlPath);
    if (pathCompare !== 0) {
      return pathCompare;
    }
    return left.method.localeCompare(right.method);
  });

  return { layouts, routes: scan.routes };
}

export function isGlobalLayoutId(layoutId: string): boolean {
  return layoutId === "/$" || layoutId === "index";
}

export function routesAffectedByLayoutChange(layoutId: string, routes: RouteEntry[]): RouteEntry[] {
  if (isGlobalLayoutId(layoutId)) {
    return routes;
  }

  return routes.filter((route) => {
    const routePath = routePathWithoutVerb(route.routeRel);
    if (layoutAppliesToRoute(layoutId, routePath)) {
      return true;
    }
    return route.layoutChain.includes(layoutId);
  });
}

export function recomputeLayoutChainsForRoutes(routes: RouteEntry[], layouts: LayoutFile[]): void {
  for (const route of routes) {
    const chain = routeLayoutChain(routePathWithoutVerb(route.routeRel), layouts);
    route.layoutChain = chain;
    route.parentLayout = chain.length > 0 ? chain[chain.length - 1]! : null;
  }
}

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { parse, parseSync } from "oxc-parser";

import { DEFAULT_IGNORE, HTTP_VERBS, ROUTE_VERB_PATTERN } from "../constants.js";
import type { ExtensionOption } from "../config.js";
import { ScanError, ScanErrorCollection } from "../support/errors.js";
import { toPosixPath } from "../support/paths.js";
import type {
  GeneratedModel,
  HttpVerb,
  LayoutFile,
  RouteEntry,
  RouteFileMethod,
  RouteMethodEntry,
  ScanResult,
} from "../types.js";
import {
  assertPhysicalRouteFile,
  buildUrlPath,
  getMethodFromRouteFile,
  importPathFromRouteRel,
  isHttpVerb,
  isLayoutFile,
  isRouteFile,
  layoutIdFromPath,
  layoutImportName,
  layoutImportPathFromRouteRel,
  layoutParentId,
  normalizeRouteRel,
  routeImportName,
  routeLayoutChain,
  routePathWithoutVerb,
  shouldIgnoreRoutePath,
} from "./paths.js";
import type { AnalysisCache } from "./cache.js";

type OxcNode = {
  type: string;
  [key: string]: unknown;
};

export type ParseRouteSourceResult = {
  errors: ScanError[];
  methods?: HttpVerb[];
};

export function createRouteFactoryName(method: RouteFileMethod): string {
  if (method === "ANY") return "t.any";
  if (method === "ALL") return "t.all";
  return `t.${method.toLowerCase()}`;
}

function expectedFactoryMember(method: RouteFileMethod): string {
  if (method === "ANY") return "any";
  if (method === "ALL") return "all";
  return method.toLowerCase();
}

function isIdentifier(node: OxcNode | undefined, name?: string): boolean {
  return node?.type === "Identifier" && (name === undefined || node.name === name);
}

function isMemberExpression(node: OxcNode | undefined): node is OxcNode & {
  object: OxcNode;
  property: OxcNode;
} {
  return node?.type === "MemberExpression";
}

function isTFactoryCall(node: OxcNode, member: string): boolean {
  if (!isMemberExpression(node)) return false;
  if (!isIdentifier(node.object, "t")) return false;
  return isIdentifier(node.property, member);
}

function isFactoryCall(node: OxcNode, member: string): boolean {
  if (isTFactoryCall(node, member)) return true;
  const standaloneName = member === "delete" ? "del" : member;
  return isIdentifier(node, standaloneName);
}

function hasExportDefault(program: OxcNode): boolean {
  const body = program.body as OxcNode[] | undefined;
  if (!body) return false;

  for (const statement of body) {
    if (statement.type === "ExportDefaultDeclaration") {
      return true;
    }
  }

  return false;
}

function forEachTopLevelCall(program: OxcNode, callback: (callNode: OxcNode) => void): void {
  const body = program.body as OxcNode[] | undefined;
  if (!body) return;

  function checkExpression(node: OxcNode | undefined): void {
    if (!node) return;
    if (node.type === "CallExpression") {
      callback(node);
      checkExpression(node.callee as OxcNode | undefined);
      const args = node.arguments as OxcNode[] | undefined;
      if (args) {
        for (const arg of args) {
          if (
            arg &&
            typeof arg === "object" &&
            "type" in arg &&
            arg.type !== "ArrowFunctionExpression" &&
            arg.type !== "FunctionExpression"
          ) {
            checkExpression(arg as OxcNode);
          }
        }
      }
    } else if (node.type === "MemberExpression") {
      checkExpression(node.object as OxcNode | undefined);
    }
  }

  for (const statement of body) {
    if (statement.type === "ExportDefaultDeclaration") {
      checkExpression(statement.declaration as OxcNode | undefined);
    } else if (statement.type === "ExportNamedDeclaration") {
      const declaration = statement.declaration as OxcNode | undefined;
      if (declaration?.type === "VariableDeclaration") {
        for (const declarator of (declaration.declarations as OxcNode[]) ?? []) {
          checkExpression(declarator.init as OxcNode | undefined);
        }
      }
    } else if (statement.type === "VariableDeclaration") {
      for (const declarator of (statement.declarations as OxcNode[]) ?? []) {
        checkExpression(declarator.init as OxcNode | undefined);
      }
    } else if (statement.type === "ExpressionStatement") {
      checkExpression(statement.expression as OxcNode | undefined);
    }
  }
}

function containsFactoryCall(root: OxcNode, member: string): boolean {
  let found = false;
  forEachTopLevelCall(root, (node) => {
    if (isFactoryCall(node.callee as OxcNode, member)) {
      found = true;
    }
  });
  return found;
}

function parseAnyMethodsFromSource(root: OxcNode, rawRel: string): ParseRouteSourceResult {
  const errors: ScanError[] = [];
  let methods: HttpVerb[] | undefined;

  forEachTopLevelCall(root, (node) => {
    if (!isFactoryCall(node.callee as OxcNode, "any")) return;

    const args = node.arguments as OxcNode[] | undefined;
    const methodsArg = args?.[1];
    if (!methodsArg || methodsArg.type !== "ArrayExpression") {
      errors.push(
        new ScanError(
          "ANY route must call `t.any(path, [methods], ...)` with a static methods array",
          rawRel,
        ),
      );
      return;
    }

    const elements = methodsArg.elements as OxcNode[] | undefined;
    if (!elements || elements.length === 0) {
      errors.push(new ScanError("ANY route methods array must be a non-empty array", rawRel));
      return;
    }

    const parsed: HttpVerb[] = [];
    const seen = new Set<string>();

    for (const element of elements) {
      if (!element || element.type !== "Literal" || typeof element.value !== "string") {
        errors.push(new ScanError("ANY route methods must be string literals", rawRel));
        continue;
      }
      const verb = element.value.toUpperCase();
      if (!isHttpVerb(verb)) {
        errors.push(
          new ScanError(
            `Unknown HTTP method "${element.value}" in t.any methods. Use one of: ${HTTP_VERBS.join(", ")}`,
            rawRel,
          ),
        );
        continue;
      }
      if (seen.has(verb)) {
        errors.push(new ScanError(`Duplicate method "${verb}" in t.any methods`, rawRel));
        continue;
      }
      seen.add(verb);
      parsed.push(verb as HttpVerb);
    }

    if (errors.length === 0) {
      methods = parsed;
    }
  });

  if (!methods && errors.length === 0) {
    errors.push(
      new ScanError(
        "ANY route must call `t.any(path, [methods], ...)` with a static methods array",
        rawRel,
      ),
    );
  }

  return { errors, ...(methods ? { methods } : {}) };
}

function parseProgram(
  source: string,
  rawRel: string,
): { program: OxcNode } | { errors: ScanError[] } {
  const result = parseSync(rawRel, source);
  if (result.errors.length > 0) {
    const message = result.errors.map((error) => error.message).join("; ");
    return { errors: [new ScanError(`Failed to parse route file: ${message}`, rawRel)] };
  }
  return { program: result.program as unknown as OxcNode };
}

async function parseProgramAsync(
  source: string,
  rawRel: string,
): Promise<{ program: OxcNode } | { errors: ScanError[] }> {
  const result = await parse(rawRel, source);
  if (result.errors.length > 0) {
    const message = result.errors.map((error) => error.message).join("; ");
    return { errors: [new ScanError(`Failed to parse route file: ${message}`, rawRel)] };
  }
  return { program: result.program as unknown as OxcNode };
}

export function analyzeRouteFileSource(
  source: string,
  rawRel: string,
  method: RouteFileMethod,
): ParseRouteSourceResult {
  const parsed = parseProgram(source, rawRel);
  if ("errors" in parsed) return { errors: parsed.errors };

  const errors: ScanError[] = [];
  if (!hasExportDefault(parsed.program)) {
    errors.push(new ScanError("Route file must have a default export", rawRel));
  }

  const factoryMember = expectedFactoryMember(method);
  const hasFactory = containsFactoryCall(parsed.program, factoryMember);
  if (!hasFactory) {
    const factoryName = createRouteFactoryName(method);
    errors.push(
      new ScanError(`Route file must use \`${factoryName}(...)\` for ${method} routes`, rawRel),
    );
  }

  if (method === "ANY") {
    const anyResult = parseAnyMethodsFromSource(parsed.program, rawRel);
    return {
      errors: [...errors, ...anyResult.errors],
      ...(anyResult.methods ? { methods: anyResult.methods } : {}),
    };
  }

  return { errors };
}

export async function analyzeRouteFileSourceAsync(
  source: string,
  rawRel: string,
  method: RouteFileMethod,
): Promise<ParseRouteSourceResult> {
  const parsed = await parseProgramAsync(source, rawRel);
  if ("errors" in parsed) return { errors: parsed.errors };

  const errors: ScanError[] = [];
  if (!hasExportDefault(parsed.program)) {
    errors.push(new ScanError("Route file must have a default export", rawRel));
  }

  const factoryMember = expectedFactoryMember(method);
  const hasFactory = containsFactoryCall(parsed.program, factoryMember);
  if (!hasFactory) {
    const factoryName = createRouteFactoryName(method);
    errors.push(
      new ScanError(`Route file must use \`${factoryName}(...)\` for ${method} routes`, rawRel),
    );
  }

  if (method === "ANY") {
    const anyResult = parseAnyMethodsFromSource(parsed.program, rawRel);
    return {
      errors: [...errors, ...anyResult.errors],
      ...(anyResult.methods ? { methods: anyResult.methods } : {}),
    };
  }

  return { errors };
}

export function analyzeLayoutFileSource(source: string, rawRel: string): ParseRouteSourceResult {
  const parsed = parseProgram(source, rawRel);
  if ("errors" in parsed) return { errors: parsed.errors };

  const errors: ScanError[] = [];
  if (!hasExportDefault(parsed.program)) {
    errors.push(new ScanError("Layout file must have a default export", rawRel));
  }

  const hasLayout = containsFactoryCall(parsed.program, "layout");
  if (!hasLayout) {
    errors.push(new ScanError("Layout file must use `t.layout(...)`", rawRel));
  }

  return { errors };
}

export async function analyzeLayoutFileSourceAsync(
  source: string,
  rawRel: string,
): Promise<ParseRouteSourceResult> {
  const parsed = await parseProgramAsync(source, rawRel);
  if ("errors" in parsed) return { errors: parsed.errors };

  const errors: ScanError[] = [];
  if (!hasExportDefault(parsed.program)) {
    errors.push(new ScanError("Layout file must have a default export", rawRel));
  }

  const hasLayout = containsFactoryCall(parsed.program, "layout");
  if (!hasLayout) {
    errors.push(new ScanError("Layout file must use `t.layout(...)`", rawRel));
  }

  return { errors };
}

const VALID_PARAM_NAME_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

function extractParamsFromSegment(segment: string): Array<{ paramName: string; isValid: boolean }> {
  const params: Array<{ paramName: string; isValid: boolean }> = [];
  if (!segment || !segment.includes("$")) return params;
  if (segment === "$" || segment === "{$}") return params;

  if (segment.startsWith("$") && !segment.includes("{")) {
    const paramName = segment.slice(1);
    if (paramName) {
      params.push({ paramName, isValid: VALID_PARAM_NAME_REGEX.test(paramName) });
    }
    return params;
  }

  const bracePattern = /\{(-?\$)([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = bracePattern.exec(segment)) !== null) {
    const paramName = match[2]!;
    if (paramName) {
      params.push({ paramName, isValid: VALID_PARAM_NAME_REGEX.test(paramName) });
    }
  }

  return params;
}

export function collectInvalidRouteParams(
  filePath: string,
): Array<{ paramName: string; filePath: string }> {
  if (!filePath || !filePath.includes("$")) return [];

  const invalid: Array<{ paramName: string; filePath: string }> = [];
  for (const segment of filePath.replace(/\\/g, "/").split("/")) {
    const basename = segment.replace(ROUTE_VERB_PATTERN, "");
    for (const param of extractParamsFromSegment(basename)) {
      if (!param.isValid) {
        invalid.push({ paramName: param.paramName, filePath });
      }
    }
  }

  return invalid;
}

export function formatInvalidParamMessage(paramName: string, filePath: string): string {
  return (
    `Invalid param name "${paramName}" in route file "${filePath}". ` +
    "Param names must be valid JavaScript identifiers (match /[a-zA-Z_$][a-zA-Z0-9_$]*/)."
  );
}

export async function walkRouteFiles(
  routesDir: string,
  ignore?: readonly string[],
  baseRoutesDir: string = routesDir,
): Promise<string[]> {
  let topLevelEntries;
  try {
    topLevelEntries = await readdir(routesDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const nestedResults = await Promise.all(
    topLevelEntries.map(async (entry) => {
      const fullPath = join(routesDir, entry.name);
      const relPath = toPosixPath(relative(baseRoutesDir, fullPath));
      if (shouldIgnoreRoutePath(relPath, ignore)) {
        return [];
      }
      if (entry.isDirectory()) {
        return walkRouteFiles(fullPath, ignore, baseRoutesDir);
      }
      if (!entry.isFile() || !entry.name.endsWith(".ts")) {
        return [];
      }
      return [fullPath];
    }),
  );

  return nestedResults.flat();
}

function parseRouteEntry(
  rawRel: string,
  routesImportBase: string,
  extension: ExtensionOption,
  methods?: RouteEntry["methods"],
): RouteEntry {
  const routeRel = normalizeRouteRel(rawRel);
  const method = getMethodFromRouteFile(routeRel);

  const entry: RouteEntry = {
    routeRel,
    urlPath: buildUrlPath(routeRel),
    method,
    layouts: [],
    importName: routeImportName(routeRel, method),
    importPath: importPathFromRouteRel(rawRel, routesImportBase, extension),
  };

  if (methods) {
    entry.methods = methods;
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

export type ScanOptions = {
  extension?: ExtensionOption;
  ignore?: readonly string[];
  cache?: AnalysisCache | undefined;
};

export async function scanRouteFiles(
  routesDir: string,
  routesImportBase: string,
  absoluteFiles: string[],
  options: ScanOptions = {},
): Promise<ScanResult> {
  const extension = options.extension ?? true;
  const errors: ScanError[] = [];
  const layouts: LayoutFile[] = [];
  const routes: RouteEntry[] = [];

  type PendingFile = {
    absolutePath: string;
    rawRel: string;
    kind: "route" | "layout";
    method?: RouteFileMethod;
  };

  const pending: PendingFile[] = [];

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

  await Promise.all(
    pending.map(async (file) => {
      if (file.kind === "route") {
        const method = file.method!;
        let methods: RouteEntry["methods"] | undefined;
        let analysis;

        if (options.cache) {
          analysis = await options.cache.analyzeRoute(file.absolutePath, file.rawRel, method);
        } else {
          const source = await readFile(file.absolutePath, "utf8").catch(() => undefined);
          if (source !== undefined) {
            analysis = await analyzeRouteFileSourceAsync(source, file.rawRel, method);
          }
        }

        if (analysis) {
          errors.push(...analysis.errors);
          methods = analysis.methods;
        }

        routes.push(parseRouteEntry(file.rawRel, routesImportBase, extension, methods));
        return;
      }

      layouts.push(parseLayoutEntry(file.rawRel, routesImportBase, extension));

      let analysis;
      if (options.cache) {
        analysis = await options.cache.analyzeLayout(file.absolutePath, file.rawRel);
      } else {
        const source = await readFile(file.absolutePath, "utf8").catch(() => undefined);
        if (source !== undefined) {
          analysis = await analyzeLayoutFileSourceAsync(source, file.rawRel);
        }
      }

      if (analysis) {
        errors.push(...analysis.errors);
      }
    }),
  );

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
  const rawRel = toPosixPath(relative(routesDir, absolutePath));
  assertPhysicalRouteFile(rawRel);

  if (isRouteFile(rawRel)) {
    const method = getMethodFromRouteFile(normalizeRouteRel(rawRel));
    const errors: ScanError[] = [];
    let methods: RouteEntry["methods"] | undefined;

    const source = await readFile(absolutePath, "utf8").catch(() => undefined);
    if (source !== undefined) {
      const analyzed = analyzeRouteFileSource(source, rawRel, method);
      errors.push(...analyzed.errors);
      methods = analyzed.methods;
    }

    const entry = parseRouteEntry(rawRel, routesImportBase, extension, methods);

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
    const source = await readFile(absolutePath, "utf8");
    const analyzed = analyzeLayoutFileSource(source, rawRel);
    if (analyzed.errors.length > 0) {
      throw new ScanErrorCollection(analyzed.errors);
    }
    return { kind: "layout", entry };
  }

  return null;
}

function resolveRouteLayouts(routeRel: string, layouts: LayoutFile[]): string[] {
  return routeLayoutChain(routePathWithoutVerb(routeRel), layouts);
}

export function finalizeScanResult(scan: ScanResult): ScanResult {
  const layouts = [...scan.layouts].sort((left, right) => left.id.localeCompare(right.id));

  for (const route of scan.routes) {
    route.layouts = resolveRouteLayouts(route.routeRel, layouts);
  }

  scan.routes.sort((left, right) => {
    const pathCompare = left.urlPath.localeCompare(right.urlPath);
    if (pathCompare !== 0) return pathCompare;
    return left.method.localeCompare(right.method);
  });

  return { layouts, routes: scan.routes };
}

function toRouteMethodEntry(route: RouteEntry, method: HttpVerb): RouteMethodEntry {
  return {
    method,
    importName: route.importName,
    routeRel: route.routeRel,
    layouts: route.layouts,
  };
}

function groupRoutesByUrlPath(routes: RouteEntry[]): Map<string, RouteEntry[]> {
  const byPath = new Map<string, RouteEntry[]>();
  for (const route of routes) {
    const list = byPath.get(route.urlPath) ?? [];
    list.push(route);
    byPath.set(route.urlPath, list);
  }
  return byPath;
}

function expandMethodsForUrlPath(pathRoutes: RouteEntry[]): RouteMethodEntry[] {
  const filled = new Map<HttpVerb, RouteMethodEntry>();
  let anyRoute: RouteEntry | undefined;
  let allRoute: RouteEntry | undefined;

  for (const route of pathRoutes) {
    if (isHttpVerb(route.method)) {
      filled.set(route.method, toRouteMethodEntry(route, route.method));
    } else if (route.method === "ANY") {
      anyRoute = route;
    } else if (route.method === "ALL") {
      allRoute = route;
    }
  }

  if (anyRoute) {
    for (const method of anyRoute.methods ?? []) {
      if (!filled.has(method)) {
        filled.set(method, toRouteMethodEntry(anyRoute, method));
      }
    }
  }

  if (allRoute) {
    for (const method of HTTP_VERBS) {
      if (!filled.has(method)) {
        filled.set(method, toRouteMethodEntry(allRoute, method));
      }
    }
  }

  return [...filled.values()].sort((left, right) => left.method.localeCompare(right.method));
}

function expandRoutesByPath(routes: RouteEntry[]): Map<string, RouteMethodEntry[]> {
  const byPath = groupRoutesByUrlPath(routes);
  const routesByPath = new Map<string, RouteMethodEntry[]>();

  for (const [urlPath, pathRoutes] of byPath) {
    routesByPath.set(urlPath, expandMethodsForUrlPath(pathRoutes));
  }

  return routesByPath;
}

export function buildGeneratedModelFromScan(scan: ScanResult): GeneratedModel {
  const layoutIds = scan.layouts.map((layout) => layout.id);
  const layoutIdSet = new Set(layoutIds);
  const layoutParents = new Map(
    layoutIds.map((layoutId) => [layoutId, layoutParentId(layoutId, layoutIdSet)]),
  );

  const routesByPath = expandRoutesByPath(scan.routes);
  const routePaths = [...routesByPath.keys()].sort();

  return {
    layouts: scan.layouts,
    routes: scan.routes,
    layoutIds,
    layoutParents,
    routePaths,
    routesByPath,
  };
}

export type ScanAndBuildOptions = {
  routesDir: string;
  routesImportBase?: string;
  extension?: ExtensionOption;
  ignore?: readonly string[];
  cache?: AnalysisCache | undefined;
};

export async function scanAndBuildModel(options: ScanAndBuildOptions): Promise<GeneratedModel> {
  const routesDir = options.routesDir;
  const routesImportBase = options.routesImportBase
    ? toPosixPath(options.routesImportBase)
    : toPosixPath(routesDir);

  const ignore = options.ignore ?? DEFAULT_IGNORE;
  const files = await walkRouteFiles(routesDir, ignore);

  const scan = await scanRouteFiles(routesDir, routesImportBase, files, {
    extension: options.extension ?? false,
    cache: options.cache,
    ignore,
  });

  return buildGeneratedModelFromScan(scan);
}

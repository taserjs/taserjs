import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";

import { DEFAULT_ENTRY } from "../constants.js";
import { ScanError } from "../support/errors.js";
import { toPosixPath } from "../support/paths.js";
import type { RouteFileMethod } from "../types.js";
import {
  buildUrlPath,
  classifyRouteFile,
  getMethodFromRouteFile,
  layoutIdFromPath,
  normalizeRouteRel,
  shouldIgnoreRoutePath,
} from "../scan/paths.js";
import { createRouteFactoryName } from "../scan/scan.js";

const ROUTE_EXPORT_PATTERN = /export\s+const\s+Route\s*=/;
const MIDDLEWARE_EXPORT_PATTERN = /export\s+const\s+Middleware\s*=/;

export function fileNeedsScaffold(source: string, kind: "route" | "layout"): boolean {
  const trimmed = source.trim();
  if (trimmed.length === 0) return true;
  if (kind === "route") return !ROUTE_EXPORT_PATTERN.test(source);
  return !MIDDLEWARE_EXPORT_PATTERN.test(source);
}

export function routeScaffoldSource(
  urlPath: string,
  method: RouteFileMethod,
  entry: string = DEFAULT_ENTRY,
): string {
  const factoryName = createRouteFactoryName(method);
  const factoryCall =
    method === "ANY" ? `${factoryName}('${urlPath}', ['GET'])` : `${factoryName}('${urlPath}')`;

  return `import { json } from '@taserjs/router/reply';
import { t } from '${entry}';

const ${method} = ${factoryCall};

export type RouteContext = typeof ${method}.$Infer.Context;

export const Route = ${method}.handler((_ctx) => {
  return json({ ok: true });
});
`;
}

export function layoutScaffoldSource(layoutId: string, entry: string = DEFAULT_ENTRY): string {
  const mountPath = layoutId === "/$" ? "/$" : layoutId;
  return `import { t } from '${entry}';

export const Middleware = t.middleware('${mountPath}').use((_ctx, next) => next());
`;
}

export type ScaffoldResult = "written" | "skipped" | "ignored";

export type ScaffoldOptions = {
  entry?: string | undefined;
  ignore?: readonly string[] | undefined;
};

function assertPathUnderRoutesDir(routesDir: string, absolutePath: string): void {
  const resolvedRoutesDir = resolve(routesDir);
  const resolvedTarget = resolve(absolutePath);
  const rel = relative(resolvedRoutesDir, resolvedTarget);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new ScanError("Scaffold path escapes routes directory", absolutePath);
  }
}

export async function scaffoldRouteFile(
  routesDir: string,
  absolutePath: string,
  options: ScaffoldOptions = {},
): Promise<ScaffoldResult> {
  assertPathUnderRoutesDir(routesDir, absolutePath);

  const relativePath = toPosixPath(relative(routesDir, absolutePath));
  if (shouldIgnoreRoutePath(relativePath, options.ignore)) {
    return "ignored";
  }

  const kind = classifyRouteFile(relativePath);
  if (!kind) {
    return "ignored";
  }

  let source = "";
  try {
    source = await readFile(absolutePath, "utf8");
  } catch {
    source = "";
  }

  if (!fileNeedsScaffold(source, kind)) {
    return "skipped";
  }

  const entry = options.entry || DEFAULT_ENTRY;

  if (kind === "layout") {
    const layoutId = layoutIdFromPath(normalizeRouteRel(relativePath));
    await writeFile(absolutePath, layoutScaffoldSource(layoutId, entry), "utf8");
    return "written";
  }

  const routeRel = normalizeRouteRel(relativePath);
  const method = getMethodFromRouteFile(routeRel);
  const urlPath = buildUrlPath(routeRel);
  await writeFile(absolutePath, routeScaffoldSource(urlPath, method, entry), "utf8");
  return "written";
}

export async function scaffoldRouteFileAtPath(
  routesDir: string,
  relativePath: string,
  options: ScaffoldOptions = {},
): Promise<ScaffoldResult> {
  const normalized = toPosixPath(relativePath);
  const absolutePath = resolve(routesDir, normalized);
  await mkdir(dirname(absolutePath), { recursive: true });
  return scaffoldRouteFile(routesDir, absolutePath, options);
}

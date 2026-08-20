import { mkdir, readFile, writeFile } from "node:fs/promises";
import path, { relative } from "node:path";

import { classifyRouteFile, getMethodFromRouteFile } from "../scan/classify.js";
import { normalizeRouteRel } from "../scan/normalize.js";
import { buildUrlPath } from "../scan/url-path.js";
import { layoutIdFromPath } from "../support/naming.js";
import { ScanError } from "../support/errors.js";
import { toPosixPath } from "../support/paths.js";
import { shouldIgnoreRoutePath } from "../scan/filter.js";
import { fileNeedsScaffold } from "./detect-exports.js";
import { layoutScaffoldSource, routeScaffoldSource } from "./route-template.js";

export type ScaffoldResult = "written" | "skipped" | "ignored";

export type ScaffoldOptions = {
  entry: string;
  ignorePrefix?: string | undefined;
  ignorePattern?: string | undefined;
};

function assertPathUnderRoutesDir(routesDir: string, absolutePath: string): void {
  const resolvedRoutesDir = path.resolve(routesDir);
  const resolvedTarget = path.resolve(absolutePath);
  const relativePath = path.relative(resolvedRoutesDir, resolvedTarget);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new ScanError("Scaffold path escapes routes directory", absolutePath);
  }
}

export async function scaffoldRouteFile(
  routesDir: string,
  absolutePath: string,
  options: ScaffoldOptions,
): Promise<ScaffoldResult> {
  assertPathUnderRoutesDir(routesDir, absolutePath);

  const relativePath = toPosixPath(relative(routesDir, absolutePath));
  if (
    shouldIgnoreRoutePath(relativePath, {
      ignorePrefix: options.ignorePrefix ?? "-",
      ignorePattern: options.ignorePattern,
    })
  ) {
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

  if (kind === "layout") {
    const layoutId = layoutIdFromPath(normalizeRouteRel(relativePath));
    await writeFile(absolutePath, layoutScaffoldSource(layoutId, options.entry), "utf8");
    return "written";
  }

  const routeRel = normalizeRouteRel(relativePath);
  const method = getMethodFromRouteFile(routeRel);
  const urlPath = buildUrlPath(routeRel);
  await writeFile(absolutePath, routeScaffoldSource(urlPath, method, options.entry), "utf8");
  return "written";
}

export async function scaffoldRouteFileAtPath(
  routesDir: string,
  relativePath: string,
  options: ScaffoldOptions,
): Promise<ScaffoldResult> {
  const normalized = toPosixPath(relativePath);
  const absolutePath = path.resolve(routesDir, normalized);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  return scaffoldRouteFile(routesDir, absolutePath, options);
}

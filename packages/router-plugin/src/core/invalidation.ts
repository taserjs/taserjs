import { isAbsolute, relative, resolve } from "pathe";

import type { TaserVirtualContext } from "./types.js";

function normalizeChangedPath(changedId: string, rootDir: string): string | undefined {
  if (!changedId || changedId.startsWith("\0")) {
    return undefined;
  }
  return isAbsolute(changedId) ? resolve(changedId) : resolve(rootDir, changedId);
}

function isUnderDir(filePath: string, dirPath: string): boolean {
  const dir = resolve(dirPath);
  const rel = relative(dir, filePath);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

function pathsEqual(a: string, b: string): boolean {
  return resolve(a) === resolve(b);
}

export function shouldInvalidateOnWatchChange(
  changedId: string,
  ctx: TaserVirtualContext,
): boolean {
  const normalized = normalizeChangedPath(changedId, ctx.rootDir);
  if (!normalized) {
    return false;
  }

  if (normalized.includes("node_modules")) {
    return false;
  }

  const rootDir = resolve(ctx.rootDir);
  const relToRoot = relative(rootDir, normalized);
  if (relToRoot.startsWith("..") || isAbsolute(relToRoot)) {
    return false;
  }

  if (isUnderDir(normalized, ctx.routesDir)) {
    return true;
  }

  if (ctx.serverEntryPath && pathsEqual(normalized, ctx.serverEntryPath)) {
    return true;
  }

  if (ctx.taserEntryPath && pathsEqual(normalized, ctx.taserEntryPath)) {
    return true;
  }

  return false;
}

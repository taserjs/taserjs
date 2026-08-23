import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

import { shouldIgnoreRoutePath } from "../scan/filter.js";
import { toPosixPath } from "../support/paths.js";

export async function walkRouteFiles(
  routesDir: string,
  ignore?: readonly string[],
  baseRoutesDir: string = routesDir,
): Promise<string[]> {
  const topLevelEntries = await readdir(routesDir, { withFileTypes: true });
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

export async function statFileMtimeMs(filePath: string): Promise<number> {
  const fileStat = await stat(filePath);
  return fileStat.mtimeMs;
}

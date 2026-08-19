import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

import type { ResolvedGeneratorConfig } from "../config/schema.js";
import { shouldIgnoreRouteFile } from "../scan/filter.js";

export async function walkRouteFiles(
  routesDir: string,
  config: Pick<ResolvedGeneratorConfig, "ignorePrefix" | "ignorePattern">,
): Promise<string[]> {
  const topLevelEntries = await readdir(routesDir, { withFileTypes: true });
  const nestedResults = await Promise.all(
    topLevelEntries.map(async (entry) => {
      const fullPath = join(routesDir, entry.name);
      if (shouldIgnoreRouteFile(entry.name, config)) {
        return [];
      }
      if (entry.isDirectory()) {
        return walkRouteFiles(fullPath, config);
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

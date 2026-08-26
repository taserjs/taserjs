import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fsp } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  AnalysisCache,
  scanAndBuildModel,
  scanRouteFiles,
  walkRouteFiles,
} from "../../src/index.js";

describe("AnalysisCache", () => {
  let testDir: string;
  let routesDir: string;

  beforeEach(async () => {
    testDir = await fsp.mkdtemp(join(tmpdir(), "taser-analysis-cache-"));
    routesDir = join(testDir, "routes");
    await fsp.mkdir(routesDir, { recursive: true });
    await fsp.writeFile(
      join(routesDir, "hello.get.ts"),
      `import { t } from '../taser.js'\nexport const Route = t.get('/hello').handler(() => {})`,
    );
    await fsp.writeFile(
      join(routesDir, "bye.get.ts"),
      `import { t } from '../taser.js'\nexport const Route = t.get('/bye').handler(() => {})`,
    );
  });

  afterEach(async () => {
    await fsp.rm(testDir, { recursive: true, force: true });
  });

  function scan() {
    return scanAndBuildModel({
      routesDir,
      routesImportBase: routesDir,
      extension: false,
      ignore: [],
    });
  }

  async function scanRouteFilesWithCache(cache: AnalysisCache) {
    const files = await walkRouteFiles(routesDir);
    return scanRouteFiles(routesDir, routesDir, files, {
      extension: false,
      cache,
    });
  }

  it("reuses analyses for unchanged files across rebuilds", async () => {
    const cache = new AnalysisCache();

    await scanRouteFilesWithCache(cache);
    expect(cache.getStats().misses).toBe(2);
    expect(cache.getStats().hits).toBe(0);

    await scanRouteFilesWithCache(cache);
    expect(cache.getStats().hits).toBe(2);
    expect(cache.getStats().misses).toBe(2);
  });

  it("re-parses only files whose mtime moved", async () => {
    const cache = new AnalysisCache();
    await scanRouteFilesWithCache(cache);

    // Ensure a distinct mtime (some filesystems have coarse timestamps).
    await new Promise((resolve) => setTimeout(resolve, 20));
    await fsp.writeFile(
      join(routesDir, "hello.get.ts"),
      `import { t } from '../taser.js'\nexport const Route = t.get('/hello').handler(() => 'v2')`,
    );

    await scanRouteFilesWithCache(cache);

    const stats = cache.getStats();
    // hello re-analyzed (miss), bye still cached (hit).
    expect(stats.hits).toBe(1);
  });

  it("delete() drops knowledge of removed files", async () => {
    const cache = new AnalysisCache();
    await scanRouteFilesWithCache(cache);
    cache.delete(join(routesDir, "hello.get.ts"));

    await scanRouteFilesWithCache(cache);
    const stats = cache.getStats();
    expect(stats.misses).toBe(3); // initial 2 + deleted file re-analysis
  });

  it("integrates with scanAndBuildModel output equality", async () => {
    const cold = await scan();
    const cache = new AnalysisCache();
    const warm = await scanAndBuildModel({
      routesDir,
      routesImportBase: routesDir,
      extension: false,
      ignore: [],
      cache,
    });

    expect(warm.routes.map((r) => r.routeRel)).toEqual(cold.routes.map((r) => r.routeRel));
    expect(warm.layoutIds).toEqual(cold.layoutIds);
  });
});

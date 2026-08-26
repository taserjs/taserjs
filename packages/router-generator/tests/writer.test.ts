import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fsp } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanAndBuildModel } from "../src/scan/scan.js";
import { AnalysisCache } from "../src/scan/cache.js";
import { writeTaserTypes, type TypeWriterState } from "../src/codegen/writer.js";

const ROUTES_ALIAS_ID = "#taserjs/routes";

describe("writeTaserTypes", () => {
  let testDir: string;
  let routesDir: string;

  beforeEach(async () => {
    testDir = await fsp.mkdtemp(join(tmpdir(), "taser-writer-test-"));
    routesDir = join(testDir, "routes");
    await fsp.mkdir(routesDir, { recursive: true });
    await fsp.writeFile(
      join(routesDir, "index.get.ts"),
      `import { t } from "../taser.js";
export const Route = t.get("/").handler(() => undefined);
`,
    );
  });

  afterEach(async () => {
    await fsp.rm(testDir, { recursive: true, force: true });
  });

  async function buildModel() {
    return scanAndBuildModel({
      routesDir,
      routesImportBase: ROUTES_ALIAS_ID,
      extension: true,
      cache: new AnalysisCache(),
      ignore: [],
    });
  }

  function options(state?: TypeWriterState) {
    return { rootDir: testDir, routesDir, ...(state ? { state } : {}) };
  }

  it("writes ambient routes.d.ts to .taser/types", async () => {
    const written = await writeTaserTypes(await buildModel(), options());
    expect(written).toBe(true);

    const generated = await fsp.readFile(join(testDir, ".taser", "types", "routes.d.ts"), "utf8");
    expect(generated).toContain("declare module");
    expect(generated).toContain("RouterRegister");
  });

  it("deduplicates writes within the state bag", async () => {
    const sharedState: TypeWriterState = {};

    expect(await writeTaserTypes(await buildModel(), options(sharedState))).toBe(true);
    expect(await writeTaserTypes(await buildModel(), options(sharedState))).toBe(false);

    // An independent consumer without shared state is not suppressed
    expect(await writeTaserTypes(await buildModel(), options({}))).toBe(true);
  });
});

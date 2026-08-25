import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fsp } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import { scanAndBuildModel, AnalysisCache } from "@taserjs/router-generator";
import { ROUTES_ALIAS_ID } from "../src/aliases.js";
import { writeTaserTypes, type TypeWriterState } from "../src/writer.js";

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
      validate: true,
      cache: new AnalysisCache(),
      ignore: [],
    });
  }

  function options(state?: TypeWriterState) {
    return { rootDir: testDir, routesDir, ...(state ? { state } : {}) };
  }

  it("adds the include entry to a commented (JSONC) tsconfig and preserves comments", async () => {
    const raw = [
      "{",
      "  // my compiler options",
      '  "compilerOptions": {',
      '    "strict": true // keep me',
      "  },",
      '  "include": ["src"]',
      "}",
    ].join("\n");
    await fsp.writeFile(join(testDir, "tsconfig.json"), raw, "utf8");

    const written = await writeTaserTypes(await buildModel(), options());
    expect(written).toBe(true);

    const updated = await fsp.readFile(join(testDir, "tsconfig.json"), "utf8");
    expect(updated).toContain("// my compiler options");
    expect(updated).toContain("// keep me");
    expect(updated).toContain('"src"');
    expect(updated).toContain('"./.taser/types/routes.d.ts"');
  });

  it("creates the include array in a commented tsconfig that lacks one", async () => {
    await fsp.writeFile(
      join(testDir, "tsconfig.json"),
      '{\n  /* top comment */\n  "compilerOptions": {}\n}\n',
      "utf8",
    );

    await writeTaserTypes(await buildModel(), options());

    const updated = await fsp.readFile(join(testDir, "tsconfig.json"), "utf8");
    expect(updated).toContain("/* top comment */");
    expect(updated).toContain('"include": ["./.taser/types/routes.d.ts"]');
  });

  it("does not duplicate the include entry on repeated runs", async () => {
    await fsp.writeFile(join(testDir, "tsconfig.json"), '{\n  "include": ["src"]\n}\n', "utf8");

    await writeTaserTypes(await buildModel(), options());
    await writeTaserTypes(await buildModel(), options());

    const updated = await fsp.readFile(join(testDir, "tsconfig.json"), "utf8");
    expect(updated.match(/\.taser\/types\/routes\.d\.ts/g)).toHaveLength(1);
  });

  it("deduplicates writes only within the caller-owned state bag", async () => {
    const sharedState: TypeWriterState = {};

    expect(await writeTaserTypes(await buildModel(), options(sharedState))).toBe(true);
    expect(await writeTaserTypes(await buildModel(), options(sharedState))).toBe(false);

    // An independent consumer (CLI vs dev server) must not be suppressed by
    // another context's memo — issue 06 / H2.
    expect(await writeTaserTypes(await buildModel(), options({}))).toBe(true);
  });
});

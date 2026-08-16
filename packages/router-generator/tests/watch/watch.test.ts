import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { CONFIG_FILE_NAME } from "../../src/config/schema.js";
import { Generator } from "../../src/generator/generator.js";

function watchGeneratorOptions(
  configDir: string,
  routesDir: string,
  outputFile: string,
  extra = {},
) {
  return {
    configFile: join(configDir, CONFIG_FILE_NAME),
    routes: routesDir,
    output: outputFile,
    validate: false,
    format: false,
    ...extra,
  };
}

describe("watch integration", () => {
  it("regenerates manifest when generator receives change events", async () => {
    const configDir = mkdtempSync(join(tmpdir(), "taser-watch-"));
    const routesDir = join(configDir, "routes");
    const outputFile = join(configDir, "routeManifest.gen.ts");
    mkdirSync(routesDir, { recursive: true });

    writeFileSync(join(routesDir, "index.get.ts"), "export const Route = null;\n");

    const generator = new Generator(watchGeneratorOptions(configDir, routesDir, outputFile));
    generator.enableWatchMode();
    await generator.run();

    writeFileSync(join(routesDir, "posts.get.ts"), "export const Route = null;\n");
    await generator.enqueue({ type: "add", filePath: join(routesDir, "posts.get.ts") });

    const manifest = readFileSync(outputFile, "utf8");
    expect(manifest).toContain("/posts");
    expect(manifest).toContain(".js");
  });

  it("skips regeneration when file mtime is unchanged", async () => {
    const configDir = mkdtempSync(join(tmpdir(), "taser-watch-skip-"));
    const routesDir = join(configDir, "routes");
    const outputFile = join(configDir, "routeManifest.gen.ts");
    mkdirSync(routesDir, { recursive: true });

    const routePath = join(routesDir, "index.get.ts");
    writeFileSync(routePath, "export const Route = null;\n");

    const generator = new Generator(
      watchGeneratorOptions(configDir, routesDir, outputFile, { quiet: true }),
    );
    generator.enableWatchMode();
    await generator.run();

    const before = readFileSync(outputFile, "utf8");
    const result = await generator.enqueue({ type: "change", filePath: routePath });

    expect(result.skippedWork).toBe(true);
    expect(readFileSync(outputFile, "utf8")).toBe(before);
  });
});

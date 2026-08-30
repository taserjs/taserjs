import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { walkRouteFiles, scanRouteFiles, ScanErrorCollection } from "../../src/index.js";
import { testGeneratorConfig } from "../helpers/test-config.js";

describe("scanRouteFiles errors", () => {
  it("collects virtual route config errors", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-scan-error-"));
    const virtualPath = join(routesDir, "__virtual.ts");
    writeFileSync(virtualPath, "export default {}\n");

    await expect(
      scanRouteFiles(routesDir, "./routes", [virtualPath], testGeneratorConfig),
    ).rejects.toThrow(ScanErrorCollection);
  });

  it("reports duplicate route path and method", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-dup-route-"));
    writeFileSync(
      join(routesDir, "posts.get.ts"),
      `import { t } from '@taserjs/router';\nexport default t.get('/posts').handler(() => {});\n`,
    );
    mkdirSync(join(routesDir, "posts"));
    writeFileSync(
      join(routesDir, "posts", "index.get.ts"),
      `import { t } from '@taserjs/router';\nexport default t.get('/posts').handler(() => {});\n`,
    );

    const files = await walkRouteFiles(routesDir, testGeneratorConfig.ignore);

    await expect(scanRouteFiles(routesDir, "./routes", files, testGeneratorConfig)).rejects.toThrow(
      ScanErrorCollection,
    );
  });

  it("reports invalid route param names", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-invalid-param-"));
    writeFileSync(
      join(routesDir, "items.$bad-name.get.ts"),
      `import { t } from '@taserjs/router';\nexport default t.get('/items/:bad-name').handler(() => {});\n`,
    );

    const files = await walkRouteFiles(routesDir, testGeneratorConfig.ignore);

    await expect(scanRouteFiles(routesDir, "./routes", files, testGeneratorConfig)).rejects.toThrow(
      ScanErrorCollection,
    );
  });

  it("validates route exports strictly", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-export-validation-"));
    writeFileSync(join(routesDir, "posts.get.ts"), "export const Route = null;\n");

    const files = await walkRouteFiles(routesDir, testGeneratorConfig.ignore);

    await expect(scanRouteFiles(routesDir, "./routes", files, testGeneratorConfig)).rejects.toThrow(
      ScanErrorCollection,
    );
  });
});

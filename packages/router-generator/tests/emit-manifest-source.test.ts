import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

import {
  emitManifestSource,
  emitTypeDeclarationsSource,
  emitVirtualManifestSource,
} from "../src/codegen/emit.js";
import { buildTestModel, testEmitOptions } from "./helpers/test-config.js";

async function buildFixtureModel() {
  const routesDir = mkdtempSync(join(tmpdir(), "taser-emit-"));
  mkdirSync(routesDir, { recursive: true });
  writeFileSync(
    join(routesDir, "index.get.ts"),
    `import { t } from '@taserjs/router';\nexport default t.get('/').handler(() => {});\n`,
  );
  return buildTestModel(routesDir);
}

describe("emitManifestSource", () => {
  it("matches emitVirtualManifestSource for virtual kind", async () => {
    const model = await buildFixtureModel();
    const options = { header: testEmitOptions.header };
    expect(emitManifestSource(model, { ...options, kind: "virtual" })).toBe(
      emitVirtualManifestSource(model, options),
    );
  });

  it("matches emitTypeDeclarationsSource for ambient-types kind", async () => {
    const model = await buildFixtureModel();
    const options = { header: testEmitOptions.header };
    expect(emitManifestSource(model, { ...options, kind: "ambient-types" })).toBe(
      emitTypeDeclarationsSource(model, options),
    );
  });

  it("emits standalone-manifest kind", async () => {
    const model = await buildFixtureModel();
    const source = emitManifestSource(model, { ...testEmitOptions, kind: "standalone-manifest" });
    expect(source).toContain("export const routeManifest =");
    expect(source).toContain("layouts:");
    expect(source).toContain("routes:");
  });

  it("defaults all kinds to double quotes when quotes is omitted", async () => {
    const model = await buildFixtureModel();
    const header = testEmitOptions.header;
    const kinds = ["virtual", "ambient-types", "standalone-manifest"] as const;

    for (const kind of kinds) {
      const source = emitManifestSource(model, { header, kind });
      expect(source, kind).toContain('"');
      expect(source, kind).not.toMatch(/from\s+'/);
    }
  });
});

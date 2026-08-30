import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  emitRouteManifestSource,
  buildGeneratedModelFromScan,
  scanRouteFiles,
  walkRouteFiles,
  scaffoldRouteFile,
  DEFAULT_ENTRY,
} from "../src/index.js";
import { testEmitOptions, testGeneratorConfig } from "./helpers/test-config.js";

const scaffoldOptions = { entry: DEFAULT_ENTRY };

describe("any/all route expansion", () => {
  it("expands any and all into concrete verbs with specificity", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-any-all-"));
    writeFileSync(
      join(routesDir, "order.get.ts"),
      `import { json, t } from '@taserjs/router'
export default t.get('/order').handler(() => json({ ok: true }))
`,
    );
    writeFileSync(
      join(routesDir, "order.any.ts"),
      `import { json, t } from '@taserjs/router'
export default t.any('/order', ['GET', 'OPTIONS']).handler(() => json({ ok: true }))
`,
    );
    writeFileSync(
      join(routesDir, "order.all.ts"),
      `import { json, t } from '@taserjs/router'
export default t.all('/order').handler(() => json({ ok: true }))
`,
    );

    const files = await walkRouteFiles(routesDir, testGeneratorConfig.ignore);
    const scan = await scanRouteFiles(routesDir, "./routes", files, testGeneratorConfig);
    const model = buildGeneratedModelFromScan(scan);
    const entries = model.routesByPath.get("/order") ?? [];
    const byMethod = Object.fromEntries(entries.map((entry) => [entry.method, entry.importName]));

    expect(byMethod.GET).toContain("Get");
    expect(byMethod.OPTIONS).toContain("Any");
    expect(byMethod.POST).toContain("All");
    expect(byMethod.PUT).toContain("All");
    expect(byMethod.PATCH).toContain("All");
    expect(byMethod.DELETE).toContain("All");
    expect(byMethod.HEAD).toContain("All");
    expect(entries).toHaveLength(7);

    const source = emitRouteManifestSource(model, testEmitOptions);
    expect(source).toContain("GET:");
    expect(source).toContain("OPTIONS:");
    expect(source).toContain("POST:");
    expect(source).not.toMatch(/\bANY\s*:/);
    expect(source).not.toMatch(/\bALL\s*:/);
  });

  it("rejects invalid any methods arrays", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-any-bad-"));
    writeFileSync(
      join(routesDir, "order.any.ts"),
      `import { json, t } from '@taserjs/router'
export default t.any('/order', []).handler(() => json({ ok: true }))
`,
    );

    const files = await walkRouteFiles(routesDir, testGeneratorConfig.ignore);
    await expect(
      scanRouteFiles(routesDir, "./routes", files, testGeneratorConfig),
    ).rejects.toThrow();
  });

  it("rejects legacy createAnyRoute factory", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-any-legacy-"));
    writeFileSync(
      join(routesDir, "order.any.ts"),
      `import { createAnyRoute } from '@taserjs/router'
import { json } from '@taserjs/router/reply'
export default createAnyRoute('/order', ['GET']).handler(() => json({ ok: true }))
`,
    );

    const files = await walkRouteFiles(routesDir, testGeneratorConfig.ignore);
    await expect(
      scanRouteFiles(routesDir, "./routes", files, testGeneratorConfig),
    ).rejects.toThrow();
  });
});

describe("options/head/any/all scaffold", () => {
  it("scaffolds options, head, any, and all route stubs", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-scaffold-verbs-"));

    for (const [file, factory] of [
      ["ping.options.ts", "t.options"],
      ["ping.head.ts", "t.head"],
      ["ping.any.ts", "t.any"],
      ["ping.all.ts", "t.all"],
    ] as const) {
      const path = join(routesDir, file);
      writeFileSync(path, "");
      // oxlint-disable-next-line no-await-in-loop
      expect(await scaffoldRouteFile(routesDir, path, scaffoldOptions)).toBe("written");
      const source = readFileSync(path, "utf8");
      expect(source).toContain(factory);
      expect(source).toContain("export default");
    }

    expect(readFileSync(join(routesDir, "ping.any.ts"), "utf8")).toContain("['GET']");
  });
});

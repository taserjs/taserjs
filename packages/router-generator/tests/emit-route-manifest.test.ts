import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { emitRouteManifestSource } from "../src/index.js";
import { buildTestModel, testEmitOptions } from "./helpers/test-config.js";

describe("emitRouteManifestSource snapshot", () => {
  it("matches golden manifest output", async () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "taser-snapshot-"));
    const routesDir = join(fixtureRoot, "routes");
    const outputFile = join(fixtureRoot, "routeManifest.gen.ts");
    mkdirSync(routesDir, { recursive: true });

    writeFileSync(
      join(routesDir, "$.ts"),
      `import { t } from '@taserjs/router';\nexport default t.layout('/$').use((_ctx, next) => next());\n`,
    );
    writeFileSync(
      join(routesDir, "index.ts"),
      `import { t } from '@taserjs/router';\nexport default t.layout('index').use((_ctx, next) => next());\n`,
    );
    writeFileSync(
      join(routesDir, "index.get.ts"),
      `import { t } from '@taserjs/router';\nexport default t.get('/').handler(() => {});\n`,
    );
    writeFileSync(
      join(routesDir, "posts.$id.get.ts"),
      `import { t } from '@taserjs/router';\nexport default t.get('/posts/:id').handler(() => {});\n`,
    );

    const model = await buildTestModel(routesDir, outputFile);
    const source = emitRouteManifestSource(model, testEmitOptions)
      .replaceAll(fixtureRoot.replace(/\\/g, "/"), "<fixture>")
      .replaceAll(fixtureRoot.replace(/\//g, "\\"), "<fixture>");

    expect(source).toContain(".js");
    expect(source).toContain("export const routeManifest =");
    expect(source).toContain("layouts:");
    expect(source).toContain("routes:");
  });
});

describe("emitRouteManifestSource", () => {
  it("emits unified routeManifest with layouts and routes trees", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-manifest-"));
    const outputFile = join(routesDir, "..", "routeManifest.gen.ts");

    writeFileSync(
      join(routesDir, "$.ts"),
      `import { t } from '@taserjs/router';\nexport default t.layout('/$').use((_ctx, next) => next());\n`,
    );
    writeFileSync(
      join(routesDir, "index.ts"),
      `import { t } from '@taserjs/router';\nexport default t.layout('index').use((_ctx, next) => next());\n`,
    );
    writeFileSync(
      join(routesDir, "index.get.ts"),
      `import { t } from '@taserjs/router';\nexport default t.get('/').handler(() => {});\n`,
    );

    const model = await buildTestModel(routesDir, outputFile);
    const source = emitRouteManifestSource(model, testEmitOptions);

    expect(source).toContain("export const routeManifest =");
    expect(source).toContain("layouts:");
    expect(source).toContain("routes:");
    expect(source).toContain('"/$"');
    expect(source).toContain("layouts:");
    expect(source).not.toContain("AppContext");
  });
});

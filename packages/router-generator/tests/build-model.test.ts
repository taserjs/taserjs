import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { buildTestModel } from "./helpers/test-config.js";

describe("scan to generated model", () => {
  it("builds a model from filesystem routes", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-routes-"));
    const outputFile = join(routesDir, "..", "routeManifest.gen.ts");

    writeFileSync(
      join(routesDir, "posts.$id.get.ts"),
      `import { t } from '@taserjs/router';\nexport default t.get('/posts/:id').handler(() => {});\n`,
    );
    writeFileSync(
      join(routesDir, "settings.ts"),
      `import { t } from '@taserjs/router';\nexport default t.layout('settings').use((_ctx, next) => next());\n`,
    );
    writeFileSync(
      join(routesDir, "settings.profile.get.ts"),
      `import { t } from '@taserjs/router';\nexport default t.get('/settings/profile').handler(() => {});\n`,
    );

    const model = await buildTestModel(routesDir, outputFile);

    expect(model.routePaths).toContain("/posts/:id");
    expect(model.routePaths).toContain("/settings/profile");
    expect(model.layoutIds).toContain("/settings");
  });

  it("builds root splat and stacked account layouts", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-routes-"));
    const outputFile = join(routesDir, "..", "routeManifest.gen.ts");

    writeFileSync(
      join(routesDir, "$.ts"),
      `import { t } from '@taserjs/router';\nexport default t.layout('/*').use((_ctx, next) => next());\n`,
    );
    writeFileSync(
      join(routesDir, "account.ts"),
      `import { t } from '@taserjs/router';\nexport default t.layout('/account').use((_ctx, next) => next());\n`,
    );
    mkdirSync(join(routesDir, "account"));
    writeFileSync(
      join(routesDir, "account", "$.ts"),
      `import { t } from '@taserjs/router';\nexport default t.layout('/account/*').use((_ctx, next) => next());\n`,
    );
    writeFileSync(
      join(routesDir, "account", "overview.get.ts"),
      `import { t } from '@taserjs/router';\nexport default t.get('/account/overview').handler(() => {});\n`,
    );

    const model = await buildTestModel(routesDir, outputFile);

    expect(model.layoutIds).toContain("/*");
    expect(model.layoutIds).toContain("/account");
    expect(model.layoutIds).toContain("/account/*");
    expect(model.layoutParents.get("/account/*")).toBe("/account");
    expect(model.layoutParents.get("/account")).toBe("/*");
    expect(model.layoutParents.get("/*")).toBe(null);

    const overviewRoute = model.routes.find((route) => route.urlPath === "/account/overview");
    expect(overviewRoute?.layouts).toEqual(["/*", "/account", "/account/*"]);
  });
});

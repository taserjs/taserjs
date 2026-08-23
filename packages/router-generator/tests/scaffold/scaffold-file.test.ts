import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { DEFAULT_ENTRY } from "../../src/constants.js";
import { scanAndBuildModel } from "../../src/generator/scan-and-build.js";
import { emitVirtualManifestSource } from "../../src/codegen/emit-route-manifest.js";
import { scaffoldRouteFile, scaffoldRouteFileAtPath } from "../../src/scaffold/scaffold-file.js";

const scaffoldOptions = { entry: DEFAULT_ENTRY };

describe("scaffoldRouteFile", () => {
  it("writes route scaffold for empty files", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-scaffold-route-"));
    const routePath = join(routesDir, "posts.get.ts");
    writeFileSync(routePath, "");

    const result = await scaffoldRouteFile(routesDir, routePath, scaffoldOptions);

    expect(result).toBe("written");
    const source = readFileSync(routePath, "utf8");
    expect(source).toContain("const GET = t.get");
    expect(source).toContain("export type RouteContext = typeof GET.$Infer.Context");
    expect(source).toContain("export const Route = GET.handler(");
  });

  it("skips non-empty route files with Route export", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-scaffold-skip-"));
    const routePath = join(routesDir, "posts.get.ts");
    writeFileSync(routePath, 'export const Route = t.get("/posts", {})\n');

    const result = await scaffoldRouteFile(routesDir, routePath, scaffoldOptions);

    expect(result).toBe("skipped");
  });

  it("writes layout scaffold for empty layout files", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-scaffold-layout-"));
    const layoutPath = join(routesDir, "settings.ts");
    writeFileSync(layoutPath, "");

    const result = await scaffoldRouteFile(routesDir, layoutPath, scaffoldOptions);

    expect(result).toBe("written");
    expect(readFileSync(layoutPath, "utf8")).toContain("t.middleware");
    expect(readFileSync(layoutPath, "utf8")).toContain("export const Middleware =");
  });

  it("ignores files starting with ignorePrefix", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-scaffold-ignore-file-"));
    const ignoredPath = join(routesDir, "-helper.ts");
    writeFileSync(ignoredPath, "");

    const result = await scaffoldRouteFile(routesDir, ignoredPath, scaffoldOptions);
    expect(result).toBe("ignored");
    expect(readFileSync(ignoredPath, "utf8")).toBe("");
  });

  it("ignores files inside folders starting with ignorePrefix", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-scaffold-ignore-folder-"));
    const folderPath = join(routesDir, "-components");
    mkdirSync(folderPath);
    const filePath = join(folderPath, "button.get.ts");
    writeFileSync(filePath, "");

    const result = await scaffoldRouteFile(routesDir, filePath, scaffoldOptions);
    expect(result).toBe("ignored");
    expect(readFileSync(filePath, "utf8")).toBe("");
  });

  it("rejects absolute paths outside routes directory", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-scaffold-outside-"));
    const outside = join(tmpdir(), "outside.get.ts");
    writeFileSync(outside, "");
    await expect(scaffoldRouteFile(routesDir, outside, scaffoldOptions)).rejects.toThrow(
      "Scaffold path escapes routes directory",
    );
  });
});

describe("scaffoldRouteFileAtPath", () => {
  it("writes route scaffold at relative path", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-scaffold-at-path-"));
    const result = await scaffoldRouteFileAtPath(routesDir, "users/$id.get.ts", scaffoldOptions);
    expect(result).toBe("written");
    const source = readFileSync(join(routesDir, "users", "$id.get.ts"), "utf8");
    expect(source).toContain("export const Route = GET.handler(");
  });

  it("rejects path traversal", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-scaffold-traverse-"));
    await expect(
      scaffoldRouteFileAtPath(routesDir, "../../outside.get.ts", scaffoldOptions),
    ).rejects.toThrow("Scaffold path escapes routes directory");
  });
});

describe("scaffold integration", () => {
  it("scaffolds empty route before manifest generation", async () => {
    const configDir = mkdtempSync(join(tmpdir(), "taser-scaffold-manifest-"));
    const routesDir = join(configDir, "routes");
    mkdirSync(routesDir, { recursive: true });

    const routePath = join(routesDir, "hello.get.ts");
    writeFileSync(routePath, "");

    // Scaffolding is an explicit write step, decoupled from the scan read path.
    await scaffoldRouteFile(routesDir, routePath, { entry: "#src/taser.js" });

    const model = await scanAndBuildModel({ routesDir });

    const manifest = emitVirtualManifestSource(model);
    expect(manifest).toContain("/hello");
    expect(readFileSync(routePath, "utf8")).toContain("t.get('/hello')");
  });
});

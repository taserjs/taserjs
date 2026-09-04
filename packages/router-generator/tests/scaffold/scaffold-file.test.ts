import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_ENTRY,
  scanAndBuildModel,
  scaffoldRouteFile,
  scaffoldRouteFileAtPath,
} from "../../src/index.js";
import { emitManifestSource } from "../../src/codegen/emit.js";

const scaffoldOptions = { entry: DEFAULT_ENTRY };

describe("scaffoldRouteFile", () => {
  it("writes route scaffold for empty files", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-scaffold-route-"));
    const routePath = join(routesDir, "posts.get.ts");
    writeFileSync(routePath, "");

    const result = await scaffoldRouteFile(routesDir, routePath, scaffoldOptions);

    expect(result).toBe("written");
    const source = readFileSync(routePath, "utf8");
    expect(source).toContain("export default t.get('/posts').handler(");
  });

  it("skips non-empty route files with default export", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-scaffold-skip-"));
    const routePath = join(routesDir, "posts.get.ts");
    writeFileSync(routePath, 'export default t.get("/posts").handler(() => {});\n');

    const result = await scaffoldRouteFile(routesDir, routePath, scaffoldOptions);

    expect(result).toBe("skipped");
  });

  it("writes layout scaffold for empty layout files", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-scaffold-layout-"));
    const layoutPath = join(routesDir, "settings.ts");
    writeFileSync(layoutPath, "");

    const result = await scaffoldRouteFile(routesDir, layoutPath, scaffoldOptions);

    expect(result).toBe("written");
    expect(readFileSync(layoutPath, "utf8")).toContain("t.layout");
    expect(readFileSync(layoutPath, "utf8")).toContain("export default t.layout('/settings')");
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
    expect(source).toContain("export default t.get('/users/:id').handler(");
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

    await scaffoldRouteFile(routesDir, routePath);

    const model = await scanAndBuildModel({ routesDir });

    const manifest = emitManifestSource(model, { kind: "virtual" });
    expect(manifest).toContain("/hello");
    expect(readFileSync(routePath, "utf8")).toContain("t.get('/hello')");
  });
});

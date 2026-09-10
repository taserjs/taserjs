import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateLayoutStub, generateRouteStub, scanRoutes } from "../src/index.js";

describe("route & layout scaffolding", () => {
  const tempDir = join(process.cwd(), "tests", "fixtures", "temp-scaffold-test");
  const routesDir = "routes";
  const fullRoutesDir = join(tempDir, routesDir);

  beforeEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    mkdirSync(fullRoutesDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("stub generators", () => {
    it("generates route stub with default double quotes and semicolons", () => {
      const code = generateRouteStub({
        method: "get",
        canonicalPath: "/users/:id",
      });

      expect(code).toContain('import { t } from "@taserjs/router";');
      expect(code).toContain('import { json } from "@taserjs/router/reply";');
      expect(code).toContain('export default t.get("/users/:id").handler(async () => {');
      expect(code).toContain('  return json({ message: "Hello from /users/:id" });');
      expect(code).toContain("});");
    });

    it("generates route stub respecting single quotes and semi: false", () => {
      const code = generateRouteStub({
        method: "post",
        canonicalPath: "/items",
        formatting: {
          quotes: "single",
          semi: false,
        },
      });

      expect(code).toContain("import { t } from '@taserjs/router'");
      expect(code).toContain("import { json } from '@taserjs/router/reply'");
      expect(code).toContain("export default t.post('/items').handler(async () => {");
      expect(code).toContain("  return json({ message: 'Hello from /items' })");
      expect(code).toContain("})");
      expect(code).not.toContain(";");
    });

    it("generates layout stub with destructured args ready to use", () => {
      const code = generateLayoutStub({
        layoutId: "/_auth/*",
      });

      expect(code).toContain('import { t } from "@taserjs/router";');
      expect(code).toContain(
        'export default t.layout("/_auth/*").use(async ({ req, ctx, state }, next) => {',
      );
      expect(code).toContain("  return await next();");
      expect(code).toContain("});");
    });

    it("generates root layout stub respecting single quotes and semi: false", () => {
      const code = generateLayoutStub({
        layoutId: "/*",
        formatting: {
          quotes: "single",
          semi: false,
        },
      });

      expect(code).toContain("import { t } from '@taserjs/router'");
      expect(code).toContain(
        "export default t.layout('/*').use(async ({ req, ctx, state }, next) => {",
      );
      expect(code).toContain("  return await next()");
      expect(code).toContain("})");
      expect(code).not.toContain(";");
    });
  });

  describe("scanRoutes integration with scaffolding", () => {
    it("populates empty route file on disk when scaffold: true", () => {
      const usersDir = join(fullRoutesDir, "users");
      mkdirSync(usersDir, { recursive: true });
      const routeFile = join(usersDir, "$id.get.ts");
      writeFileSync(routeFile, "", "utf-8");

      const result = scanRoutes({
        routesDir,
        cwd: tempDir,
        scaffold: true,
      });

      expect(result.diagnostics).toHaveLength(0);
      expect(result.routes).toHaveLength(1);
      expect(result.routes[0]?.canonicalPath).toBe("/users/:id");
      expect(result.routes[0]?.method).toBe("GET");

      const writtenContent = readFileSync(routeFile, "utf-8");
      expect(writtenContent).toContain('export default t.get("/users/:id").handler(async () => {');
      expect(writtenContent).toContain('import { json } from "@taserjs/router/reply";');
    });

    it("populates empty layout file on disk when scaffold: true", () => {
      const adminDir = join(fullRoutesDir, "admin");
      mkdirSync(adminDir, { recursive: true });
      const layoutFile = join(adminDir, "$.ts");
      writeFileSync(layoutFile, "", "utf-8");

      const result = scanRoutes({
        routesDir,
        cwd: tempDir,
        scaffold: true,
      });

      expect(result.diagnostics).toHaveLength(0);
      expect(result.layouts).toHaveLength(1);
      expect(result.layouts[0]?.layoutId).toBe("/admin/*");

      const writtenContent = readFileSync(layoutFile, "utf-8");
      expect(writtenContent).toContain(
        'export default t.layout("/admin/*").use(async ({ req, ctx, state }, next) => {',
      );
    });

    it("populates whitespace-only file when scaffold: true", () => {
      const routeFile = join(fullRoutesDir, "index.get.ts");
      writeFileSync(routeFile, "   \n\t  \n", "utf-8");

      const result = scanRoutes({
        routesDir,
        cwd: tempDir,
        scaffold: true,
      });

      expect(result.diagnostics).toHaveLength(0);
      expect(result.routes).toHaveLength(1);
      expect(result.routes[0]?.canonicalPath).toBe("/");

      const writtenContent = readFileSync(routeFile, "utf-8");
      expect(writtenContent).toContain('export default t.get("/").handler(async () => {');
    });

    it("does not overwrite non-empty files (e.g. comments or existing handlers)", () => {
      const routeFile = join(fullRoutesDir, "custom.get.ts");
      const existingCode = "// Work in progress\n";
      writeFileSync(routeFile, existingCode, "utf-8");

      const result = scanRoutes({
        routesDir,
        cwd: tempDir,
        scaffold: true,
      });

      // Does not overwrite with stub!
      const contentAfterScan = readFileSync(routeFile, "utf-8");
      expect(contentAfterScan).toBe(existingCode);

      // Diagnostic reports missing default export because user's WIP is not yet a valid route
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics[0]?.message).toContain("Missing default export");
    });

    it("does not populate empty files when scaffold: false (production / CI mode)", () => {
      const routeFile = join(fullRoutesDir, "test.get.ts");
      writeFileSync(routeFile, "", "utf-8");

      const result = scanRoutes({
        routesDir,
        cwd: tempDir,
        scaffold: false,
      });

      // File remains empty
      expect(readFileSync(routeFile, "utf-8")).toBe("");
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics[0]?.message).toContain("Missing default export");
    });

    it("does not touch ignored files even if empty", () => {
      const ignoredFile = join(fullRoutesDir, "-helper.ts");
      writeFileSync(ignoredFile, "", "utf-8");

      const result = scanRoutes({
        routesDir,
        cwd: tempDir,
        scaffold: true,
      });

      expect(result.diagnostics).toHaveLength(0);
      expect(result.routes).toHaveLength(0);
      expect(result.layouts).toHaveLength(0);
      expect(readFileSync(ignoredFile, "utf-8")).toBe("");
    });

    it("honors custom formatting options when scaffolding", () => {
      const routeFile = join(fullRoutesDir, "api.post.ts");
      writeFileSync(routeFile, "", "utf-8");

      const result = scanRoutes({
        routesDir,
        cwd: tempDir,
        scaffold: true,
        formatting: {
          quotes: "single",
          semi: false,
        },
      });

      expect(result.diagnostics).toHaveLength(0);
      const writtenContent = readFileSync(routeFile, "utf-8");
      expect(writtenContent).toContain("import { t } from '@taserjs/router'");
      expect(writtenContent).toContain("export default t.post('/api').handler(async () => {");
      expect(writtenContent).toContain("return json({ message: 'Hello from /api' })");
      expect(writtenContent).not.toContain(";");
    });
  });
});

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanRoutes, validateAst } from "../src/scanner.js";

describe("route scanner and AST validation", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "taser-scanner-test-"));
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("scans valid routes and layouts (.ts and .tsx) and ignores files with '-' prefix", () => {
    const routesDir = join(tempDir, "routes");
    mkdirSync(routesDir, { recursive: true });
    mkdirSync(join(routesDir, "admin"), { recursive: true });
    mkdirSync(join(routesDir, "-shared"), { recursive: true });

    // Root layout
    writeFileSync(
      join(routesDir, "$.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/*").use(async (_c, next) => next());',
    );

    // Root route (.tsx)
    writeFileSync(
      join(routesDir, "index.get.tsx"),
      'import { t } from "@taserjs/router";\nexport default t.get("/").handler(() => new Response("home"));',
    );

    // Child route (.ts)
    writeFileSync(
      join(routesDir, "admin", "users.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/admin/users").handler(() => new Response("users"));',
    );

    // Ignored files
    writeFileSync(join(routesDir, "-types.ts"), "export type User = { id: string };");
    writeFileSync(join(routesDir, "-shared", "utils.ts"), "export const noop = () => {};");

    const result = scanRoutes({ routesDir, cwd: tempDir });
    expect(result.diagnostics).toHaveLength(0);
    expect(result.routes).toHaveLength(2);
    expect(result.layouts).toHaveLength(1);

    expect(result.layouts[0]?.layoutId).toBe("/*");
    expect(result.routes.map((r) => r.canonicalPath).sort()).toEqual(["/", "/admin/users"]);
  });

  it("detects route path parameters and catch-all splats", () => {
    const routesDir = join(tempDir, "routes");
    mkdirSync(routesDir, { recursive: true });

    writeFileSync(
      join(routesDir, "users.$id.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/users/:id").handler(() => new Response("user"));',
    );

    writeFileSync(
      join(routesDir, "files.$.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/files/*").handler(() => new Response("file"));',
    );

    const result = scanRoutes({ routesDir, cwd: tempDir });
    expect(result.diagnostics).toHaveLength(0);
    expect(result.routes.map((r) => r.canonicalPath).sort()).toEqual(["/files/*", "/users/:id"]);
  });

  it("flags diagnostic when route file is missing default export", () => {
    const diags = validateAst("users.get.ts", "export const foo = 1;", "route", "get", "/users");
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toMatch(/Missing default export/);
  });

  it("flags diagnostic when layout file is missing default export", () => {
    const diags = validateAst("admin.ts", "export const adminRole = 'admin';", "layout", null, "");
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toMatch(/Missing default export/);
  });

  it("flags diagnostic when route HTTP verb mismatches filename verb", () => {
    const code =
      'import { t } from "@taserjs/router";\nexport default t.post("/users").handler(() => new Response("ok"));';
    const diags = validateAst("users.get.ts", code, "route", "get", "/users");
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toMatch(/Mismatched HTTP method/);
  });

  it("flags diagnostic when route builder path argument mismatches canonical URL", () => {
    const code =
      'import { t } from "@taserjs/router";\nexport default t.get("/different").handler(() => new Response("ok"));';
    const diags = validateAst("users.get.ts", code, "route", "get", "/users");
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toMatch(/Mismatched route path/);
  });

  it("flags diagnostic when route builder passes filesystem tokens like $param", () => {
    const code =
      'import { t } from "@taserjs/router";\nexport default t.get("/users/$id").handler(() => new Response("ok"));';
    const diags = validateAst("users.$id.get.ts", code, "route", "get", "/users/:id");
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toMatch(/contains filesystem tokens/);
  });

  it("flags diagnostic when a non-verb file does not export a layout", () => {
    const code =
      'import { t } from "@taserjs/router";\nexport default t.get("/users").handler(() => new Response("ok"));';
    const diags = validateAst("helpers.ts", code, "layout", null, "", "/helpers/*");
    expect(diags).toHaveLength(1);
    expect(diags[0]?.message).toMatch(/Layout files must export default "t\.layout\(\.\.\.\)"/);
  });

  it("detects route collision between different files resolving to identical path and method", () => {
    const routesDir = join(tempDir, "routes");
    mkdirSync(join(routesDir, "posts", "$id"), { recursive: true });

    // File 1: posts.$id.get.ts -> GET /posts/:id
    writeFileSync(
      join(routesDir, "posts.$id.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/posts/:id").handler(() => new Response("ok"));',
    );

    // File 2: posts/$id/index.get.ts -> GET /posts/:id
    writeFileSync(
      join(routesDir, "posts", "$id", "index.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/posts/:id").handler(() => new Response("ok"));',
    );

    const result = scanRoutes({ routesDir, cwd: tempDir });
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.message).toMatch(/Route collision detected/);
    expect(result.diagnostics[0]?.message).toMatch(/GET \/posts\/:id/);
  });

  it("detects layout collision between sibling and nested layouts", () => {
    const routesDir = join(tempDir, "routes");
    mkdirSync(join(routesDir, "admin"), { recursive: true });

    // Sibling layout: admin.ts
    writeFileSync(
      join(routesDir, "admin.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/admin/*");',
    );

    // Nested layout: admin/$.ts
    writeFileSync(
      join(routesDir, "admin", "$.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/admin/*");',
    );

    const result = scanRoutes({ routesDir, cwd: tempDir });
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.message).toMatch(/Layout collision detected/);
    expect(result.diagnostics[0]?.message).toMatch(/admin/);
  });

  it("detects layout collision between sibling and nested pathless layouts", () => {
    const routesDir = join(tempDir, "routes");
    mkdirSync(join(routesDir, "_auth"), { recursive: true });

    // Sibling layout: _auth.ts
    writeFileSync(
      join(routesDir, "_auth.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/_auth/*");',
    );

    // Nested layout: _auth/$.ts
    writeFileSync(
      join(routesDir, "_auth", "$.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/_auth/*");',
    );

    const result = scanRoutes({ routesDir, cwd: tempDir });
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.message).toMatch(/Layout collision detected/);
    expect(result.diagnostics[0]?.message).toMatch(/_auth/);
  });

  it("reports diagnostic error for missing layout path argument", () => {
    const routesDir = join(tempDir, "routes");
    mkdirSync(routesDir, { recursive: true });

    writeFileSync(
      join(routesDir, "$.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout();',
    );

    const result = scanRoutes({ routesDir, cwd: tempDir });
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.message).toMatch(
      /Layout definition in ".*" must provide a static string path argument/,
    );
    expect(result.diagnostics[0]?.message).toMatch(/canonical layout pattern "\/\*"/);
  });

  it("reports diagnostic error for invalid bracket escaping like [...slug]", () => {
    const routesDir = join(tempDir, "routes");
    mkdirSync(routesDir, { recursive: true });

    writeFileSync(
      join(routesDir, "[...slug].get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/:slug").handler(() => new Response("ok"));',
    );

    const result = scanRoutes({ routesDir, cwd: tempDir });
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.message).toMatch(/and "\[\.\.\.slug\]" is not supported/);
  });

  it("reports diagnostic error for mismatched layout path argument", () => {
    const routesDir = join(tempDir, "routes");
    mkdirSync(join(routesDir, "admin"), { recursive: true });

    writeFileSync(
      join(routesDir, "admin.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/wrong/*");',
    );

    const result = scanRoutes({ routesDir, cwd: tempDir });
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.message).toMatch(/Mismatched layout path/);
    expect(result.diagnostics[0]?.message).toMatch(/Expected path pattern "\/admin\/\*"/);
  });
});

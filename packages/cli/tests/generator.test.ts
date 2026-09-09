import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config.js";
import { generateManifest } from "../src/generator.js";
import { scanRoutes } from "../src/scanner.js";

describe("manifest codegen and content-hash caching", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "taser-gen-test-"));
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("generates static route manifest with top-level imports and canonical Hono keys", () => {
    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(routesDir, { recursive: true });
    mkdirSync(join(routesDir, "admin"), { recursive: true });

    // Root layout
    writeFileSync(
      join(routesDir, "$.tsx"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/*");',
    );

    // Admin layout (nested)
    writeFileSync(
      join(routesDir, "admin", "$.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/admin/*");',
    );

    // Root route
    writeFileSync(
      join(routesDir, "index.get.tsx"),
      'import { t } from "@taserjs/router";\nexport default t.get("/").handler(() => new Response("ok"));',
    );

    // Admin root route (segment root)
    writeFileSync(
      join(routesDir, "admin", "index.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/admin").handler(() => new Response("admin"));',
    );

    // Admin child route
    writeFileSync(
      join(routesDir, "admin", "users.$id.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/admin/users/:id").handler(() => new Response("admin-user"));',
    );

    const config = {
      ...DEFAULT_CONFIG,
      routesDir: "./src/routes",
      outputDir: "./.taserjs",
    };

    const scanResult = scanRoutes({ routesDir, cwd: tempDir });
    const genResult = generateManifest(scanResult, config, tempDir);

    expect(genResult.manifestWritten).toBe(true);
    expect(genResult.typesWritten).toBe(true);

    const code = genResult.content;

    // Check static imports
    expect(code).toMatch(/import layout_0 from "\.\.\/src\/routes\/\$\.tsx";/);
    expect(code).toMatch(/import layout_1 from "\.\.\/src\/routes\/admin\/\$\.ts";/);
    expect(code).toMatch(/export const routeManifest = {/);
    expect(code).toMatch(/export type RouteManifest = typeof routeManifest;/);

    // Check layout scoping:
    // Root "/" inherits ["/*"]
    expect(code).toMatch(/"\/":\s*{\s*GET:\s*{\s*layouts:\s*\["\/\*"\],/);

    // Admin root "/admin" inherits both ["/*", "/admin/*"]
    expect(code).toMatch(/"\/admin":\s*{\s*GET:\s*{\s*layouts:\s*\["\/\*", "\/admin\/\*"\],/);

    // Admin descendant "/admin/users/:id" inherits both ["/*", "/admin/*"]
    expect(code).toMatch(
      /"\/admin\/users\/:id":\s*{\s*GET:\s*{\s*layouts:\s*\["\/\*", "\/admin\/\*"\],/,
    );
  });

  it("handles pathless layouts wrapping nested routes", () => {
    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(join(routesDir, "_auth"), { recursive: true });

    // Pathless layout
    writeFileSync(
      join(routesDir, "_auth.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/_auth/*");',
    );

    // Route inside pathless group
    writeFileSync(
      join(routesDir, "_auth", "login.post.ts"),
      'import { t } from "@taserjs/router";\nexport default t.post("/login").handler(() => new Response("login"));',
    );

    const config = {
      ...DEFAULT_CONFIG,
      routesDir: "./src/routes",
      outputDir: "./.taserjs",
    };

    const scanResult = scanRoutes({ routesDir, cwd: tempDir });
    const genResult = generateManifest(scanResult, config, tempDir);

    expect(genResult.content).toMatch(/"\/login":\s*{\s*POST:\s*{\s*layouts:\s*\["\/_auth\/\*"\],/);
  });

  it("avoids disk writes when content has not changed (content-hash caching)", () => {
    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(routesDir, { recursive: true });

    writeFileSync(
      join(routesDir, "hello.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/hello").handler(() => new Response("hi"));',
    );

    const config = {
      ...DEFAULT_CONFIG,
      routesDir: "./src/routes",
      outputDir: "./.taserjs",
    };

    const scan1 = scanRoutes({ routesDir, cwd: tempDir });
    const gen1 = generateManifest(scan1, config, tempDir);
    expect(gen1.manifestWritten).toBe(true);

    // Second call without modifications
    const scan2 = scanRoutes({ routesDir, cwd: tempDir });
    const gen2 = generateManifest(scan2, config, tempDir);
    expect(gen2.manifestWritten).toBe(false);
  });

  it("supports single quote formatting option", () => {
    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(routesDir, { recursive: true });

    writeFileSync(
      join(routesDir, "index.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/").handler(() => new Response("ok"));',
    );

    const config = {
      ...DEFAULT_CONFIG,
      routesDir: "./src/routes",
      outputDir: "./.taserjs",
      formatting: { quotes: "single" as const },
    };

    const scan = scanRoutes({ routesDir, cwd: tempDir });
    const gen = generateManifest(scan, config, tempDir);

    expect(gen.content).toMatch(/import route_0 from '\.\.\/src\/routes\/index\.get\.ts';/);
    expect(gen.content).toMatch(/'\/': {/);
  });
});

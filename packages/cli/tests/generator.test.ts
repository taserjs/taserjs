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

    const config = { ...DEFAULT_CONFIG };

    const scanResult = scanRoutes({ routesDir, cwd: tempDir });
    const genResult = generateManifest(scanResult, config, tempDir);

    expect(genResult.manifestWritten).toBe(true);
    expect(genResult.typesWritten).toBe(true);
    expect(genResult.content).toMatchSnapshot();
  });

  it("handles pathless segment layouts correctly", () => {
    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(join(routesDir, "_auth"), { recursive: true });

    writeFileSync(
      join(routesDir, "_auth.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/_auth/*");',
    );

    writeFileSync(
      join(routesDir, "_auth", "login.post.ts"),
      'import { t } from "@taserjs/router";\nexport default t.post("/login").handler(() => new Response("login"));',
    );

    const config = { ...DEFAULT_CONFIG };

    const scanResult = scanRoutes({ routesDir, cwd: tempDir });
    const genResult = generateManifest(scanResult, config, tempDir);

    expect(genResult.content).toMatchSnapshot();
  });

  it("skips writing files when content hash is unchanged", () => {
    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(routesDir, { recursive: true });

    writeFileSync(
      join(routesDir, "hello.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/hello").handler(() => new Response("hello"));',
    );

    const config = { ...DEFAULT_CONFIG };

    const scan1 = scanRoutes({ routesDir, cwd: tempDir });
    const gen1 = generateManifest(scan1, config, tempDir);
    expect(gen1.manifestWritten).toBe(true);
    expect(gen1.typesWritten).toBe(true);

    const scan2 = scanRoutes({ routesDir, cwd: tempDir });
    const gen2 = generateManifest(scan2, config, tempDir);
    expect(gen2.manifestWritten).toBe(false);
    expect(gen2.typesWritten).toBe(false);
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
      formatting: { quotes: "single" as const },
    };

    const scan = scanRoutes({ routesDir, cwd: tempDir });
    const gen = generateManifest(scan, config, tempDir);

    expect(gen.content).toMatchSnapshot();
  });

  it("emits unified routes.gen.ts extracting AppContext from src/taser.ts and compiles inverted app", () => {
    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(routesDir, { recursive: true });
    mkdirSync(join(tempDir, "src"), { recursive: true });

    // Write src/taser.ts
    writeFileSync(
      join(tempDir, "src", "taser.ts"),
      `import { defineTaser, createContext } from "@taserjs/router";
export default defineTaser().context(createContext({
  boot: async () => ({ db: "db-pool" }),
  request: () => ({ requestId: "req-1" }),
}));
`,
    );

    // Root layout with cookies
    writeFileSync(
      join(routesDir, "$.ts"),
      'import { t } from "@taserjs/router";\nimport { cookie } from "@taserjs/router/cookie";\nexport default t.layout("/*").use(cookie());',
    );

    // Users route
    writeFileSync(
      join(routesDir, "users.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/users").handler(() => new Response("users"));',
    );

    const config = { ...DEFAULT_CONFIG };

    const scan = scanRoutes({ routesDir, cwd: tempDir });
    const gen = generateManifest(scan, config, tempDir);

    expect(gen.manifestPath).toMatch(/routes\.gen\.ts$/);
    expect(gen.typesPath).toMatch(/routes\.gen\.ts$/);
    expect(gen.manifestWritten).toBe(true);
    expect(gen.typesWritten).toBe(true);
    expect(gen.content).toMatchSnapshot();
  });

  it("defaults AppContext to Record<string, unknown> when src/taser.ts does not exist", () => {
    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(routesDir, { recursive: true });

    writeFileSync(
      join(routesDir, "index.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/").handler(() => new Response("ok"));',
    );

    const config = { ...DEFAULT_CONFIG };

    const scan = scanRoutes({ routesDir, cwd: tempDir });
    const gen = generateManifest(scan, config, tempDir);

    expect(gen.content).toMatchSnapshot();
  });
});

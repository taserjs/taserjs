import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config.js";
import { generateManifest, generateManifestCode, resolveLayoutsForRoute } from "../src/generator.js";
import { scanRoutes, type DiscoveredLayout, type DiscoveredRoute, type ScanResult } from "../src/scanner.js";

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
      formatting: { ...DEFAULT_CONFIG.formatting, quotes: "single" as const },
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
      'import { t } from "@taserjs/router";\nimport { cookie } from "@taserjs/router/middleware/cookie";\nexport default t.layout("/*").use(cookie());',
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
    expect(gen.manifestWritten).toBe(true);
    expect(gen.content).toMatchSnapshot();
  });

  it("defaults AppContext to {} when src/taser.ts does not exist", () => {
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

  it("respects extension configuration for module import specifiers", () => {
    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(routesDir, { recursive: true });
    mkdirSync(join(tempDir, "src"), { recursive: true });

    writeFileSync(
      join(tempDir, "src", "taser.ts"),
      'import { defineTaser } from "@taserjs/router";\nexport default defineTaser();',
    );
    writeFileSync(
      join(routesDir, "hello.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/hello").handler(() => new Response("hello"));',
    );
    writeFileSync(
      join(routesDir, "$.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/*");',
    );

    const scanResult = scanRoutes({ routesDir, cwd: tempDir });

    // 1. extension: true (default -> .js)
    const genDefault = generateManifest(
      scanResult,
      { ...DEFAULT_CONFIG, extension: true },
      tempDir,
    );
    expect(genDefault.content).toContain('import taser from "../taser.js";');
    expect(genDefault.content).toContain('import layout_0 from "../routes/$.js";');
    expect(genDefault.content).toContain('import route_0 from "../routes/hello.get.js";');

    // 2. extension: false (no extension)
    const genNoExt = generateManifest(scanResult, { ...DEFAULT_CONFIG, extension: false }, tempDir);
    expect(genNoExt.content).toContain('import taser from "../taser";');
    expect(genNoExt.content).toContain('import layout_0 from "../routes/$";');
    expect(genNoExt.content).toContain('import route_0 from "../routes/hello.get";');

    // 3. extension: "mjs"
    const genMjs = generateManifest(scanResult, { ...DEFAULT_CONFIG, extension: "mjs" }, tempDir);
    expect(genMjs.content).toContain('import taser from "../taser.mjs";');
    expect(genMjs.content).toContain('import layout_0 from "../routes/$.mjs";');
    expect(genMjs.content).toContain('import route_0 from "../routes/hello.get.mjs";');

    // 4. extension: ".ts"
    const genTs = generateManifest(scanResult, { ...DEFAULT_CONFIG, extension: ".ts" }, tempDir);
    expect(genTs.content).toContain('import taser from "../taser.ts";');
    expect(genTs.content).toContain('import layout_0 from "../routes/$.ts";');
    expect(genTs.content).toContain('import route_0 from "../routes/hello.get.ts";');
  });

  it("generates valid POSIX manifest imports from Windows-style paths", () => {
    const cwd = "C:/Users/alice/my-project";
    const scanResult: ScanResult = {
      routes: [
        {
          kind: "route",
          filePath: "routes\\users.get.ts",
          absolutePath: "C:\\Users\\alice\\my-project\\src\\routes\\users.get.ts",
          method: "GET",
          canonicalPath: "/users",
          segmentHierarchy: ["", "users"],
        },
      ],
      layouts: [
        {
          kind: "layout",
          filePath: "routes\\$.tsx",
          absolutePath: "C:\\Users\\alice\\my-project\\src\\routes\\$.tsx",
          layoutId: "/*",
          targetSegment: "",
          isSibling: false,
        },
      ],
      diagnostics: [],
    };

    const { manifestCode } = generateManifestCode(scanResult, DEFAULT_CONFIG, cwd);

    expect(manifestCode).toContain('import layout_0 from "../routes/$.js";');
    expect(manifestCode).toContain('import route_0 from "../routes/users.get.js";');
    expect(manifestCode).not.toContain("\\");
  });

  it("filters layout chains and emits clean layout arrays in routeManifest and RouteByPathMethod for breakout routes", () => {
    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(routesDir, { recursive: true });
    mkdirSync(join(routesDir, "tasks"), { recursive: true });
    mkdirSync(join(routesDir, "posts"), { recursive: true });
    mkdirSync(join(routesDir, "_auth"), { recursive: true });

    // Root layout (/*)
    writeFileSync(
      join(routesDir, "$.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/*");',
    );

    // Posts collection layout (/posts/*)
    writeFileSync(
      join(routesDir, "posts.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/posts/*");',
    );

    // Posts item layout (/posts/:id/*)
    writeFileSync(
      join(routesDir, "posts", "$id.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/posts/:id/*");',
    );

    // Tasks directory layout (/tasks/*)
    writeFileSync(
      join(routesDir, "tasks", "$.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/tasks/*");',
    );

    // Tasks item layout (/tasks/:id/*)
    writeFileSync(
      join(routesDir, "tasks", "$id.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/tasks/:id/*");',
    );

    // Pathless group layout (/_auth/*)
    writeFileSync(
      join(routesDir, "_auth.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/_auth/*");',
    );

    // 1. Root breakout: health_.get.ts -> empty layouts
    writeFileSync(
      join(routesDir, "health_.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/health").handler(() => new Response("ok"));',
    );

    // 2. Root index breakout: index_.get.ts -> empty layouts
    writeFileSync(
      join(routesDir, "index_.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/").handler(() => new Response("home"));',
    );

    // 3. Flat breakout: posts_.$id.preview.get.ts -> skips posts.ts, keeps /*
    writeFileSync(
      join(routesDir, "posts_.$id.preview.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/posts/:id/preview").handler(() => new Response("preview"));',
    );

    // 4. Resource root index breakout (nested directory): posts/index_.get.ts -> skips posts.ts, keeps /*
    writeFileSync(
      join(routesDir, "posts", "index_.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/posts").handler(() => new Response("posts"));',
    );

    // 5. Nested directory stem breakout: tasks/$id_.complete.patch.ts -> skips tasks/$id.ts, keeps /* and /tasks/*
    writeFileSync(
      join(routesDir, "tasks", "$id_.complete.patch.ts"),
      'import { t } from "@taserjs/router";\nexport default t.patch("/tasks/:id/complete").handler(() => new Response("complete"));',
    );

    // 6. Descendant layout exclusion: posts_.$id.sub.get.ts -> skips posts.ts and posts/$id.ts, keeps /*
    writeFileSync(
      join(routesDir, "posts_.$id.sub.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/posts/:id/sub").handler(() => new Response("sub"));',
    );

    // 7. Pathless group breakout: _auth/posts_.$id.get.ts -> inherits /_auth/* and /*, skips posts.ts
    writeFileSync(
      join(routesDir, "_auth", "posts_.$id.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/posts/:id").handler(() => new Response("auth-post"));',
    );

    // 8. Inert breakout: unknown_.$id.get.ts -> inherits /* (safely no-ops)
    writeFileSync(
      join(routesDir, "unknown_.$id.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/unknown/:id").handler(() => new Response("inert"));',
    );

    const scanResult = scanRoutes({ routesDir, cwd: tempDir });
    expect(scanResult.diagnostics).toHaveLength(0);

    const { manifestCode } = generateManifestCode(scanResult, DEFAULT_CONFIG, tempDir);
    expect(manifestCode).toMatchSnapshot();

    // Check routeManifest.routes output
    // 1. health: layouts: []
    expect(manifestCode).toContain('"/health": {\n      GET: {\n        layouts: [],');

    // 2. index: layouts: []
    expect(manifestCode).toContain('"/": {\n      GET: {\n        layouts: [],');

    // 3. /posts/:id/preview: layouts: ["/*"]
    expect(manifestCode).toContain('"/posts/:id/preview": {\n      GET: {\n        layouts: ["/*"],');

    // 4. /posts: layouts: ["/*"]
    expect(manifestCode).toContain('"/posts": {\n      GET: {\n        layouts: ["/*"],');

    // 5. /tasks/:id/complete: layouts: ["/*", "/tasks/*"]
    expect(manifestCode).toContain('"/tasks/:id/complete": {\n      PATCH: {\n        layouts: ["/*", "/tasks/*"],');

    // 6. /posts/:id/sub: layouts: ["/*"]
    expect(manifestCode).toContain('"/posts/:id/sub": {\n      GET: {\n        layouts: ["/*"],');

    // 7. /posts/:id: layouts: ["/*", "/_auth/*"]
    expect(manifestCode).toContain('"/posts/:id": {\n      GET: {\n        layouts: ["/*", "/_auth/*"],');

    // 8. /unknown/:id: layouts: ["/*"]
    expect(manifestCode).toContain('"/unknown/:id": {\n      GET: {\n        layouts: ["/*"],');

    // Check ambient RouteByPathMethod type output
    expect(manifestCode).toContain('"/health": {\n      GET: {\n        layouts: readonly [];');
    expect(manifestCode).toContain('"/": {\n      GET: {\n        layouts: readonly [];');
    expect(manifestCode).toContain('"/posts/:id/preview": {\n      GET: {\n        layouts: readonly ["/*"];');
    expect(manifestCode).toContain('"/tasks/:id/complete": {\n      PATCH: {\n        layouts: readonly ["/*", "/tasks/*"];');
    expect(manifestCode).toContain('"/posts/:id": {\n      GET: {\n        layouts: readonly ["/*", "/_auth/*"];');
    expect(manifestCode).toContain('"/unknown/:id": {\n      GET: {\n        layouts: readonly ["/*"];');
  });

  it("resolves layouts correctly for routes with breakout segment hierarchies via resolveLayoutsForRoute", () => {
    const rootLayout: DiscoveredLayout = {
      kind: "layout",
      filePath: "$.ts",
      absolutePath: "/app/src/routes/$.ts",
      layoutId: "/*",
      targetSegment: "",
      isSibling: false,
    };
    const postsLayout: DiscoveredLayout = {
      kind: "layout",
      filePath: "posts.ts",
      absolutePath: "/app/src/routes/posts.ts",
      layoutId: "/posts/*",
      targetSegment: "posts",
      isSibling: true,
    };
    const tasksLayout: DiscoveredLayout = {
      kind: "layout",
      filePath: "tasks/$.ts",
      absolutePath: "/app/src/routes/tasks/$.ts",
      layoutId: "/tasks/*",
      targetSegment: "tasks",
      isSibling: false,
    };

    const layoutsBySegment = new Map<string, DiscoveredLayout>([
      ["", rootLayout],
      ["posts", postsLayout],
      ["tasks", tasksLayout],
    ]);

    // Breakout route with empty hierarchy (root-level breakout)
    const rootBreakoutRoute: DiscoveredRoute = {
      kind: "route",
      filePath: "health_.get.ts",
      absolutePath: "/app/src/routes/health_.get.ts",
      method: "GET",
      canonicalPath: "/health",
      segmentHierarchy: [],
    };
    expect(resolveLayoutsForRoute(rootBreakoutRoute, layoutsBySegment)).toEqual([]);

    // Breakout route retaining only root (posts breakout)
    const postsBreakoutRoute: DiscoveredRoute = {
      kind: "route",
      filePath: "posts_.$id.get.ts",
      absolutePath: "/app/src/routes/posts_.$id.get.ts",
      method: "GET",
      canonicalPath: "/posts/:id",
      segmentHierarchy: [""],
    };
    expect(resolveLayoutsForRoute(postsBreakoutRoute, layoutsBySegment)).toEqual(["/*"]);

    // Breakout route retaining root and tasks
    const tasksBreakoutRoute: DiscoveredRoute = {
      kind: "route",
      filePath: "tasks/$id_.complete.patch.ts",
      absolutePath: "/app/src/routes/tasks/$id_.complete.patch.ts",
      method: "PATCH",
      canonicalPath: "/tasks/:id/complete",
      segmentHierarchy: ["", "tasks"],
    };
    expect(resolveLayoutsForRoute(tasksBreakoutRoute, layoutsBySegment)).toEqual(["/*", "/tasks/*"]);
  });
});

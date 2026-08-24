import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fsp } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import { createTaserVirtualContext } from "../src/core/context.js";
import { scaffoldRouteFile } from "@taserjs/router-generator";
import { setupTaserNitro } from "../src/nitro.js";
import type { Nitro } from "nitro/types";

describe("vite-plugin-taser", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fsp.mkdtemp(join(tmpdir(), "taser-plugin-test-"));
    const routesDir = join(testDir, "routes");
    await fsp.mkdir(routesDir, { recursive: true });

    // Create taser.ts
    await fsp.writeFile(
      join(testDir, "taser.ts"),
      `import { createTaserApp } from "@taserjs/router";
export const t = createTaserApp();
`,
    );

    // Create routes/$.ts (layout)
    await fsp.writeFile(
      join(routesDir, "$.ts"),
      `import { t } from "../taser.js";
export const Middleware = t.middleware("$").use((ctx, next) => next());
`,
    );

    // Create routes/index.get.ts
    await fsp.writeFile(
      join(routesDir, "index.get.ts"),
      `import { t } from "../taser.js";
import { reply } from "@taserjs/router";
export const Route = t.get("/").handle(() => reply.text("hello"));
`,
    );
  });

  afterEach(async () => {
    // Late async writes (types/tsconfig from a just-finished batch) can race
    // the removal — retry briefly before giving up.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        // oxlint-disable-next-line no-await-in-loop
        await fsp.rm(testDir, { recursive: true, force: true });
        return;
      } catch {
        // oxlint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 50));
      }
    }
  });

  it("emits virtual manifest with routes and layouts", async () => {
    const ctx = createTaserVirtualContext({
      rootDir: testDir,
      routesDir: "routes",
    });

    const manifestCode = await ctx.getManifestCode();
    expect(manifestCode).toContain("routeManifest");
    expect(manifestCode).toContain("routes");
    expect(manifestCode).toContain("index.get.js");
  });

  it("emits virtual entry importing taser.ts and manifest", async () => {
    const ctx = createTaserVirtualContext({
      rootDir: testDir,
      routesDir: "routes",
    });

    const entryCode = await ctx.getEntryCode();
    expect(entryCode).toContain("import { t } from");
    expect(entryCode).toContain('import { routeManifest } from "#taserjs/virtual/manifest";');
    expect(entryCode).toContain("createNitroRouteHandler(app)");
  });

  it("writes ambient types to .taser/types/routes.d.ts", async () => {
    const ctx = createTaserVirtualContext({
      rootDir: testDir,
      routesDir: "routes",
    });

    const written = await ctx.writeTypes();
    expect(written).toBe(true);

    const typesPath = join(testDir, ".taser/types/routes.d.ts");
    const content = await fsp.readFile(typesPath, "utf8");
    expect(content).toContain("RouterRegister");
    expect(content).toContain("RouteManifest");

    // Second run with no changes should return false (no re-write)
    const writtenAgain = await ctx.writeTypes();
    expect(writtenAgain).toBe(false);
  });

  it("configures Nitro to disable scanning and add Taser handler", async () => {
    const mod = {
      rootDir: testDir,
      basePath: "/api",
    };

    const hooksOnce: Record<string, () => void | Promise<void>> = {};
    const mockNitro: any = {
      options: {
        rootDir: testDir,
        routesDir: "routes",
        apiDir: "api",
        scanDirs: ["routes", "api"],
        serverDir: "server",
        handlers: [],
        virtual: {},
      },
      hooks: {
        hook: () => {},
        hookOnce: (name: string, fn: () => void | Promise<void>) => {
          hooksOnce[name] = fn;
        },
      },
    };

    setupTaserNitro(mockNitro as Nitro, mod);

    // Real configuration is deferred to the build lifecycle so that multiple
    // multiple setup registrations merge into one application.
    expect(mockNitro.options.routesDir).toBe("routes");
    await hooksOnce["build:before"]();

    expect(mockNitro.options.routesDir).toBe("");
    expect(mockNitro.options.apiDir).toBe("");
    expect(mockNitro.options.scanDirs).toEqual([]);
    expect(mockNitro.options.serverDir).toBe(false);
    expect(mockNitro.options.handlers).toHaveLength(1);
    expect(mockNitro.options.handlers[0].route).toBe("/api/**");
    expect(mockNitro.options.handlers[0].handler).toBe("#taserjs/virtual/entry");
    expect(mockNitro.options.virtual["#taserjs/virtual/manifest"]).toBeDefined();
    expect(mockNitro.options.virtual["#taserjs/virtual/entry"]).toBeDefined();
  });

  it("ignores duplicate taser setup registrations", async () => {
    const modA = { rootDir: testDir, basePath: "/api" };
    const modB = { rootDir: testDir, basePath: "/other" };

    const hooksOnce: Record<string, () => void | Promise<void>> = {};
    const mockNitro: any = {
      options: {
        rootDir: testDir,
        routesDir: "routes",
        apiDir: "api",
        scanDirs: [],
        serverDir: false,
        handlers: [{ route: "/pre-existing", handler: "x" }],
        virtual: {},
      },
      hooks: {
        hook: () => {},
        // Mimic hookable(): hookOnce handlers unregister after first call.
        hookOnce: (name: string, fn: () => void | Promise<void>) => {
          hooksOnce[name] = () => {
            delete hooksOnce[name];
            void fn();
          };
        },
      },
    };

    setupTaserNitro(mockNitro as Nitro, modA);
    setupTaserNitro(mockNitro as Nitro, modB);
    await hooksOnce["build:before"]();

    // hookOnce semantics: the setup cannot run a second time.
    expect(hooksOnce["build:before"]).toBeUndefined();

    // Handler registered once; the first registration wins.
    expect(mockNitro.options.handlers).toHaveLength(2);
    expect(mockNitro.options.handlers[0].route).toBe("/api/**");
  });

  it("scaffolds newly added route files via the batch pipeline, not during scans", async () => {
    const emptyRoutePath = join(testDir, "routes/users.get.ts");
    await fsp.writeFile(emptyRoutePath, "");

    const ctx = createTaserVirtualContext({
      rootDir: testDir,
      routesDir: "routes",
    });

    // Read path must not write to the source tree: an empty file yields a scan
    // error instead of being silently filled.
    await expect(ctx.getManifestCode()).rejects.toThrow("users.get.ts");

    // Scaffolding fills the file and refreshes types.
    await scaffoldRouteFile(ctx.routesDir, emptyRoutePath, {
      entry: ctx.options.entry,
      ignore: ctx.ignore,
    });
    ctx.invalidate();
    await ctx.writeTypes();

    const scaffoldedContent = await fsp.readFile(emptyRoutePath, "utf8");
    expect(scaffoldedContent).toContain("const GET = t.get");
    expect(scaffoldedContent).toContain("export const Route = GET.handler");

    const manifestCode = await ctx.getManifestCode();
    expect(manifestCode).toContain("users.get.js");
  });

  it("analysis cache prevents re-parsing unchanged files across invalidations", async () => {
    const ctx = createTaserVirtualContext({
      rootDir: testDir,
      routesDir: "routes",
    });

    await ctx.getManifestCode();
    const firstStats = ctx.analysisCache.getStats();
    expect(firstStats.misses).toBeGreaterThan(0);

    ctx.invalidate();
    await ctx.getManifestCode();

    const secondStats = ctx.analysisCache.getStats();
    // Same files, no mtime changes → every analysis is a cache hit.
    expect(secondStats.hits).toBe(firstStats.misses);
    expect(secondStats.misses).toBe(firstStats.misses);
  });
});

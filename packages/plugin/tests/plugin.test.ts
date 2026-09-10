import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isOutputDir, isSubPath, normalizeImportPath, taserPlugin, taser } from "../src/index.js";
import { buildNitroMiddlewareHandlerSource, buildNitroStandaloneAppSource } from "../src/nitro.js";

describe("@taserjs/plugin core", () => {
  let tempDir: string;
  let routesDir: string;
  let outputDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "taser-plugin-test-"));
    routesDir = join(tempDir, "src", "routes");
    outputDir = join(tempDir, "src", ".taserjs");
    mkdirSync(routesDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("exports plugin factories", () => {
    expect(typeof taserPlugin).toBe("object");
    expect(typeof taserPlugin.vite).toBe("function");
    expect(typeof taserPlugin.rollup).toBe("function");
    expect(typeof taserPlugin.webpack).toBe("function");
    expect(typeof taserPlugin.rspack).toBe("function");
    expect(typeof taserPlugin.esbuild).toBe("function");
    expect(typeof taser).toBe("function");
  });

  it("buildStart triggers initial manifest generation", async () => {
    // Write a route file
    const routeCode = `
import { t } from "@taserjs/router";
export default t.get("/users").handler(() => Response.json({ ok: true }));
`;
    writeFileSync(join(routesDir, "users.get.ts"), routeCode, "utf-8");

    const rawPlugin = taserPlugin.raw({ cwd: tempDir }, { framework: "rollup" });
    const pluginInstance = (Array.isArray(rawPlugin) ? rawPlugin[0] : rawPlugin)!;

    // Call buildStart
    await (pluginInstance.buildStart as any)?.call({
      addWatchFile: vi.fn(),
      emitFile: vi.fn(),
      getWatchFiles: vi.fn(),
      parse: vi.fn(),
    });

    const manifestPath = join(outputDir, "routes.gen.ts");

    expect(existsSync(manifestPath)).toBe(true);

    const manifestContent = readFileSync(manifestPath, "utf-8");
    expect(manifestContent).toContain('"/users"');
  });

  it("watchChange ignores changes in outputDir (.taserjs/**)", async () => {
    const rawPlugin = taserPlugin.raw({ cwd: tempDir }, { framework: "rollup" });
    const pluginInstance = (Array.isArray(rawPlugin) ? rawPlugin[0] : rawPlugin)!;

    // Initialize via buildStart
    await (pluginInstance.buildStart as any)?.call({
      addWatchFile: vi.fn(),
      emitFile: vi.fn(),
      getWatchFiles: vi.fn(),
      parse: vi.fn(),
    });

    const outputFilePath = join(outputDir, "routes.gen.ts");

    // Invoking watchChange for a file in outputDir should be ignored
    expect(() => {
      pluginInstance.watchChange?.call(
        {
          addWatchFile: vi.fn(),
          emitFile: vi.fn(),
          getWatchFiles: vi.fn(),
          parse: vi.fn(),
        },
        outputFilePath,
        { event: "update" },
      );
    }).not.toThrow();
  });

  it("watchChange triggers manifest regeneration when routes change", async () => {
    const rawPlugin = taserPlugin.raw({ cwd: tempDir }, { framework: "rollup" });
    const pluginInstance = (Array.isArray(rawPlugin) ? rawPlugin[0] : rawPlugin)!;

    // Initial buildStart with no routes
    await (pluginInstance.buildStart as any)?.call({
      addWatchFile: vi.fn(),
      emitFile: vi.fn(),
      getWatchFiles: vi.fn(),
      parse: vi.fn(),
    });

    const manifestPath = join(outputDir, "routes.gen.ts");
    expect(existsSync(manifestPath)).toBe(true);
    let content = readFileSync(manifestPath, "utf-8");
    expect(content).not.toContain('"/posts"');

    // Add a new route file
    const postRoutePath = join(routesDir, "posts.get.ts");
    writeFileSync(
      postRoutePath,
      'import { t } from "@taserjs/router";\nexport default t.get("/posts").handler(() => Response.json([]));',
      "utf-8",
    );

    // Trigger watchChange
    await (pluginInstance.watchChange as any)?.call(
      {
        addWatchFile: vi.fn(),
        emitFile: vi.fn(),
        getWatchFiles: vi.fn(),
        parse: vi.fn(),
      },
      postRoutePath,
      { event: "create" },
    );

    content = readFileSync(manifestPath, "utf-8");
    expect(content).toContain('"/posts"');
  });

  it("vite config hook configures server.watch.ignored to ignore outputDir", () => {
    const rawPlugin = taserPlugin.raw({ cwd: tempDir }, { framework: "vite" });
    const pluginInstance = (Array.isArray(rawPlugin) ? rawPlugin[0] : rawPlugin)!;

    const viteHooks = pluginInstance.vite;
    expect(viteHooks).toBeDefined();
    expect(typeof viteHooks?.config).toBe("function");

    const viteConfig: any = { server: { watch: {} } };
    (viteHooks!.config as any)(viteConfig, { command: "serve", mode: "development" });

    expect(viteConfig.server.watch.ignored).toBeDefined();
    const ignored = viteConfig.server.watch.ignored;
    const isIgnored = Array.isArray(ignored)
      ? ignored.some((pattern: string | RegExp) =>
          typeof pattern === "string"
            ? pattern.includes(".taserjs")
            : pattern.test("src/.taserjs/routes.gen.ts"),
        )
      : false;
    expect(isIgnored).toBe(true);
  });

  it("emitServeShim respects config.extension setting", async () => {
    // 1. Default config (extension: true -> ./routes.gen.js)
    const rawPluginDefault = taserPlugin.raw({ cwd: tempDir }, { framework: "rollup" });
    const pluginDefault = (
      Array.isArray(rawPluginDefault) ? rawPluginDefault[0] : rawPluginDefault
    )!;

    await (pluginDefault.buildStart as any)?.call({
      addWatchFile: vi.fn(),
      emitFile: vi.fn(),
      getWatchFiles: vi.fn(),
      parse: vi.fn(),
    });

    const serveShimPath = join(outputDir, "serve.mjs");
    expect(existsSync(serveShimPath)).toBe(true);
    let serveContent = readFileSync(serveShimPath, "utf-8");
    expect(serveContent).toContain('import { app } from "./routes.gen.js";');

    // 2. Custom config with extension: false (extensionless -> ./routes.gen)
    writeFileSync(
      join(tempDir, "taserjs.config.ts"),
      "export default { extension: false };",
      "utf-8",
    );

    const rawPluginNoExt = taserPlugin.raw({ cwd: tempDir }, { framework: "rollup" });
    const pluginNoExt = (Array.isArray(rawPluginNoExt) ? rawPluginNoExt[0] : rawPluginNoExt)!;

    await (pluginNoExt.buildStart as any)?.call({
      addWatchFile: vi.fn(),
      emitFile: vi.fn(),
      getWatchFiles: vi.fn(),
      parse: vi.fn(),
    });

    serveContent = readFileSync(serveShimPath, "utf-8");
    expect(serveContent).toContain('import { app } from "./routes.gen";');
  });

  describe("server option and full-stack auto-detection", () => {
    it("disables serve.mjs emission when server is false", async () => {
      const rawPlugin = taserPlugin.raw({ cwd: tempDir, server: false }, { framework: "vite" });
      const pluginInstance = (Array.isArray(rawPlugin) ? rawPlugin[0] : rawPlugin)!;

      await (pluginInstance.buildStart as any)?.call({
        addWatchFile: vi.fn(),
        emitFile: vi.fn(),
        getWatchFiles: vi.fn(),
        parse: vi.fn(),
      });

      const manifestPath = join(outputDir, "routes.gen.ts");
      const serveShimPath = join(outputDir, "serve.mjs");

      // routes.gen.ts should still be generated
      expect(existsSync(manifestPath)).toBe(true);
      // serve.mjs should NOT be generated
      expect(existsSync(serveShimPath)).toBe(false);
    });

    it("does not configure build.ssr in vite config hook when server is false", async () => {
      const rawPlugin = taserPlugin.raw({ cwd: tempDir, server: false }, { framework: "vite" });
      const pluginInstance = (Array.isArray(rawPlugin) ? rawPlugin[0] : rawPlugin)!;

      const viteHooks = pluginInstance.vite;
      const result = await (viteHooks!.config as any)(
        { plugins: [] },
        { command: "build", mode: "production" },
      );
      expect(result).toBeUndefined();
    });

    it("auto-detects full-stack plugins in vite config and disables server mode", async () => {
      const fullstackPlugins = [
        [{ name: "tanstack-react-start:config" }],
        [{ name: "nitro:init" }],
        [{ name: "react-router" }],
        [{ name: "@remix-run/dev" }],
        [{ name: "astro:server" }],
        [{ name: "vite-plugin-sveltekit-compile" }],
      ];

      await Promise.all(
        fullstackPlugins.map(async (plugins) => {
          const rawPlugin = taserPlugin.raw({ cwd: tempDir }, { framework: "vite" });
          const pluginInstance = (Array.isArray(rawPlugin) ? rawPlugin[0] : rawPlugin)!;
          const viteHooks = pluginInstance.vite;

          const result = await (viteHooks!.config as any)(
            { plugins },
            { command: "build", mode: "production" },
          );
          expect(result).toBeUndefined();

          await (pluginInstance.buildStart as any)?.call({
            addWatchFile: vi.fn(),
            emitFile: vi.fn(),
            getWatchFiles: vi.fn(),
            parse: vi.fn(),
          });

          const serveShimPath = join(outputDir, "serve.mjs");
          expect(existsSync(serveShimPath)).toBe(false);
        }),
      );
    });

    it("allows explicit server: true to override full-stack auto-detection", async () => {
      const rawPlugin = taserPlugin.raw({ cwd: tempDir, server: true }, { framework: "vite" });
      const pluginInstance = (Array.isArray(rawPlugin) ? rawPlugin[0] : rawPlugin)!;
      const viteHooks = pluginInstance.vite;

      const result = await (viteHooks!.config as any)(
        { plugins: [{ name: "nitro:init" }] },
        { command: "build", mode: "production" },
      );

      expect(result).toBeDefined();
      expect(result?.build?.ssr).toBeDefined();

      await (pluginInstance.buildStart as any)?.call({
        addWatchFile: vi.fn(),
        emitFile: vi.fn(),
        getWatchFiles: vi.fn(),
        parse: vi.fn(),
      });

      const serveShimPath = join(outputDir, "serve.mjs");
      expect(existsSync(serveShimPath)).toBe(true);
    });

    it("respects server: false from taserjs.config.ts", async () => {
      writeFileSync(
        join(tempDir, "taserjs.config.ts"),
        "export default { server: false };",
        "utf-8",
      );

      const rawPlugin = taserPlugin.raw({ cwd: tempDir }, { framework: "vite" });
      const pluginInstance = (Array.isArray(rawPlugin) ? rawPlugin[0] : rawPlugin)!;
      const viteHooks = pluginInstance.vite;

      const result = await (viteHooks!.config as any)(
        { plugins: [] },
        { command: "build", mode: "production" },
      );
      expect(result).toBeUndefined();

      await (pluginInstance.buildStart as any)?.call({
        addWatchFile: vi.fn(),
        emitFile: vi.fn(),
        getWatchFiles: vi.fn(),
        parse: vi.fn(),
      });

      const serveShimPath = join(outputDir, "serve.mjs");
      expect(existsSync(serveShimPath)).toBe(false);
    });
  });

  describe("cross-platform Windows path support", () => {
    it("normalizeImportPath formats relative and absolute Windows paths correctly", () => {
      expect(normalizeImportPath(".\\routes.gen.js")).toBe("./routes.gen.js");
      expect(normalizeImportPath("./routes.gen.js")).toBe("./routes.gen.js");
      expect(normalizeImportPath("..\\routes.gen.js")).toBe("../routes.gen.js");
      expect(normalizeImportPath("C:\\Users\\alice\\project\\src\\.taserjs\\routes.gen.ts")).toBe(
        "C:/Users/alice/project/src/.taserjs/routes.gen.ts",
      );
    });

    it("isSubPath correctly detects containment with Windows-style backslashes", () => {
      const parent = "C:\\Users\\alice\\project\\src\\routes";
      const child = "C:\\Users\\alice\\project\\src\\routes\\users\\$id.get.ts";
      const outside = "C:\\Users\\alice\\project\\src\\other\\file.ts";
      const differentDrive = "D:\\Users\\alice\\project\\src\\routes\\users.get.ts";

      expect(isSubPath(child, parent)).toBe(true);
      expect(isSubPath(outside, parent)).toBe(false);
      expect(isSubPath(differentDrive, parent)).toBe(false);
    });

    it("isOutputDir matches identical paths and subpaths on Windows", () => {
      const outputDir = "C:\\Users\\alice\\project\\src\\.taserjs";
      const exact = "C:\\Users\\alice\\project\\src\\.taserjs";
      const inside = "C:\\Users\\alice\\project\\src\\.taserjs\\routes.gen.ts";
      const outside = "C:\\Users\\alice\\project\\src\\routes\\users.get.ts";

      expect(isOutputDir(exact, outputDir)).toBe(true);
      expect(isOutputDir(inside, outputDir)).toBe(true);
      expect(isOutputDir(outside, outputDir)).toBe(false);
    });

    it("nitro code generators normalize Windows-style backslashes", () => {
      const windowsPath = "C:\\Users\\alice\\project\\src\\.taserjs\\routes.gen.ts";
      const standalone = buildNitroStandaloneAppSource(windowsPath);
      expect(standalone).toContain(
        'import { app as taserApp } from "C:/Users/alice/project/src/.taserjs/routes.gen.ts";',
      );
      expect(standalone).not.toContain("C:\\Users");

      const middleware = buildNitroMiddlewareHandlerSource(windowsPath);
      expect(middleware).toContain(
        'import { app as taserApp } from "C:/Users/alice/project/src/.taserjs/routes.gen.ts";',
      );
      expect(middleware).not.toContain("C:\\Users");
    });
  });
});

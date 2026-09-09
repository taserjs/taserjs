import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { taserPlugin, taser, VERSION } from "../src/index.js";

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

  it("exports VERSION and plugin factories", () => {
    expect(VERSION).toBe("0.0.1");
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

    const manifestPath = join(outputDir, "routes.ts");
    const typesPath = join(outputDir, "routes.d.ts");

    expect(existsSync(manifestPath)).toBe(true);
    expect(existsSync(typesPath)).toBe(true);

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

    const outputFilePath = join(outputDir, "routes.ts");

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

    const manifestPath = join(outputDir, "routes.ts");
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
            : pattern.test("src/.taserjs/routes.ts"),
        )
      : false;
    expect(isIgnored).toBe(true);
  });
});

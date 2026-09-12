import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  detectHostServer,
  emitServeShim,
  isOutputDir,
  isSubPath,
  mountHostFallback,
  normalizeImportPath,
  resolveHostFetchHandler,
  taserPlugin,
  taser,
} from "../src/index.js";
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

  describe("host server entry detection and assembly", () => {
    it("detectHostServer returns null when no host server entry exists", () => {
      const result = detectHostServer(join(tempDir, "src"));
      expect(result).toBeNull();
    });

    it("detectHostServer detects server.node.ts as node host", () => {
      const serverDir = join(tempDir, "src");
      const hostFile = join(serverDir, "server.node.ts");
      writeFileSync(hostFile, "export default (req, res) => res.end();", "utf-8");

      const result = detectHostServer(serverDir);
      expect(result).toEqual({
        type: "node",
        path: hostFile,
      });
    });

    it("detectHostServer detects server.ts as fetch host", () => {
      const serverDir = join(tempDir, "src");
      const hostFile = join(serverDir, "server.ts");
      writeFileSync(hostFile, "export default (req) => new Response();", "utf-8");

      const result = detectHostServer(serverDir);
      expect(result).toEqual({
        type: "fetch",
        path: hostFile,
      });
    });

    it("detectHostServer prioritizes server.node.ts over server.ts if both exist", () => {
      const serverDir = join(tempDir, "src");
      writeFileSync(
        join(serverDir, "server.node.ts"),
        "export default (req, res) => res.end();",
        "utf-8",
      );
      writeFileSync(
        join(serverDir, "server.ts"),
        "export default (req) => new Response();",
        "utf-8",
      );

      const result = detectHostServer(serverDir);
      expect(result).toEqual({
        type: "node",
        path: join(serverDir, "server.node.ts"),
      });
    });

    it("detectHostServer supports explicit entry path", () => {
      const customPath = join(tempDir, "custom-host.node.ts");
      writeFileSync(customPath, "export default (req, res) => res.end();", "utf-8");

      const result = detectHostServer(join(tempDir, "src"), tempDir, "custom-host.node.ts");
      expect(result).toEqual({
        type: "node",
        path: customPath,
      });
    });

    it("emitServeShim generates standalone shim with node host fallback", () => {
      const shimPath = join(outputDir, "serve.mjs");
      const hostPath = join(tempDir, "src", "server.node.ts");
      writeFileSync(hostPath, "export default (req, res) => res.end();", "utf-8");

      emitServeShim(shimPath, "./routes.gen.js", { type: "node", path: hostPath }, ".js");

      const content = readFileSync(shimPath, "utf-8");
      expect(content).toContain('import { serve } from "srvx/node";');
      expect(content).toContain('import { toFetchHandler } from "srvx/node";');
      expect(content).toContain('import hostServerEntry from "../server.node.js";');
      expect(content).toContain("toFetchHandler(nodeHandler)");
      expect(content).toContain('app.all("*", (c) => hostFetch(c.req.raw));');
      expect(content).toContain("serve(app);");
    });

    it("emitServeShim generates standalone shim with fetch host fallback", () => {
      const shimPath = join(outputDir, "serve.mjs");
      const hostPath = join(tempDir, "src", "server.ts");
      writeFileSync(hostPath, "export default (req) => new Response();", "utf-8");

      emitServeShim(shimPath, "./routes.gen.js", { type: "fetch", path: hostPath }, ".js");

      const content = readFileSync(shimPath, "utf-8");
      expect(content).toContain('import { serve } from "srvx/node";');
      expect(content).toContain('import hostServerEntry from "../server.js";');
      expect(content).not.toContain("toFetchHandler");
      expect(content).toContain('app.all("*", (c) => hostFetch(c.req.raw));');
      expect(content).toContain("serve(app);");
    });

    it("buildNitroStandaloneAppSource generates host server fallback code for node host", () => {
      const routesGenPath = join(outputDir, "routes.gen.ts");
      const hostPath = join(tempDir, "src", "server.node.ts");

      const code = buildNitroStandaloneAppSource(routesGenPath, { type: "node", path: hostPath });
      expect(code).toContain('import { toFetchHandler } from "srvx/node";');
      expect(code).toContain("toFetchHandler(nodeHandler)");
      expect(code).toContain('taserApp.all("*", (c) => hostFetch(c.req.raw));');
    });

    it("buildNitroMiddlewareHandlerSource generates host server fallback code for fetch host", () => {
      const routesGenPath = join(outputDir, "routes.gen.ts");
      const hostPath = join(tempDir, "src", "server.ts");

      const code = buildNitroMiddlewareHandlerSource(routesGenPath, {
        type: "fetch",
        path: hostPath,
      });
      expect(code).toContain('taserApp.all("*", (c) => hostFetch(c.req.raw));');
    });

    it("resolveHostFetchHandler correctly handles node request listener and routing fastify", async () => {
      const nodeFn = (req: any, res: any) => {
        res.end("node response");
      };
      const fetchHandler1 = resolveHostFetchHandler(nodeFn, "node");
      expect(typeof fetchHandler1).toBe("function");

      const fastifyLike = {
        routing: (req: any, res: any) => {
          res.end("fastify response");
        },
      };
      const fetchHandler2 = resolveHostFetchHandler(fastifyLike, "node");
      expect(typeof fetchHandler2).toBe("function");
    });

    it("resolveHostFetchHandler correctly handles fetch host object or function", async () => {
      const fetchObj = {
        fetch: (_req: Request) => new Response("ok"),
      };
      const fetchHandler1 = resolveHostFetchHandler(fetchObj, "fetch");
      expect(typeof fetchHandler1).toBe("function");
      const res1 = await fetchHandler1!(new Request("http://localhost/test"));
      expect(await res1.text()).toBe("ok");

      const fetchFn = (_req: Request) => new Response("direct");
      const fetchHandler2 = resolveHostFetchHandler(fetchFn, "fetch");
      expect(typeof fetchHandler2).toBe("function");
      const res2 = await fetchHandler2!(new Request("http://localhost/test"));
      expect(await res2.text()).toBe("direct");
    });

    it("mountHostFallback mounts app.all once and prevents re-mounting", () => {
      const calls: string[] = [];
      const mockApp: any = {
        all(path: string, _fn: any) {
          calls.push(path);
        },
      };

      const mounted1 = mountHostFallback(mockApp, () => {}, "node");
      expect(mounted1).toBe(true);
      expect(mockApp._hasHostFallback).toBe(true);
      expect(calls).toEqual(["*"]);

      const mounted2 = mountHostFallback(mockApp, () => {}, "node");
      expect(mounted2).toBe(false);
      expect(calls.length).toBe(1);
    });
  });
});

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";

import { resolveConfig, resolvePaths } from "@taserjs/cli";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  nitroHandlerSource,
  nitroStandaloneAppSource,
  relativeHostImport,
  serveShimSource,
} from "../src/codegen.js";
import { detectHostServer } from "../src/host.js";
import { detectFullStack, isServerMode, shouldRegenerate, taserPlugin } from "../src/plugin.js";

const ROUTE_SOURCE = (path: string) =>
  `import { t } from "@taserjs/router";\nexport default t.get("${path}").handler(() => Response.json({ ok: true }));`;

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
    rmSync(tempDir, { recursive: true, force: true });
  });

  const createPlugin = (options: Record<string, unknown> = {}, framework = "rollup") => {
    const raw = taserPlugin.raw({ cwd: tempDir, ...options }, { framework } as any);
    return (Array.isArray(raw) ? raw[0] : raw) as any;
  };
  const buildStart = (plugin: any) => plugin.buildStart.call({});
  const watchChange = (plugin: any, file: string) => plugin.watchChange.call({}, file, {});
  const viteConfig = (plugin: any, config: any, command = "build") =>
    plugin.vite.config(config, { command, mode: "production" });

  it("exposes a factory for every supported bundler", () => {
    for (const bundler of ["vite", "rollup", "webpack", "rspack", "esbuild"] as const) {
      expect(typeof taserPlugin[bundler]).toBe("function");
    }
  });

  it("buildStart generates the manifest", async () => {
    writeFileSync(join(routesDir, "users.get.ts"), ROUTE_SOURCE("/users"));

    await buildStart(createPlugin());

    expect(readFileSync(join(outputDir, "routes.gen.ts"), "utf-8")).toContain('"/users"');
  });

  describe("watchChange", () => {
    it("regenerates when a route is added", async () => {
      const plugin = createPlugin();
      await buildStart(plugin);

      const added = join(routesDir, "posts.get.ts");
      writeFileSync(added, ROUTE_SOURCE("/posts"));
      await watchChange(plugin, added);

      expect(readFileSync(join(outputDir, "routes.gen.ts"), "utf-8")).toContain('"/posts"');
    });

    it("ignores files inside the output directory", async () => {
      const plugin = createPlugin();
      await buildStart(plugin);
      const manifest = join(outputDir, "routes.gen.ts");
      const before = readFileSync(manifest, "utf-8");

      writeFileSync(join(routesDir, "late.get.ts"), ROUTE_SOURCE("/late"));
      await watchChange(plugin, manifest);

      expect(readFileSync(manifest, "utf-8")).toBe(before);
    });
  });

  it("emits the serve shim honoring the configured import extension", async () => {
    const shim = join(outputDir, "serve.ts");

    await buildStart(createPlugin());
    expect(readFileSync(shim, "utf-8")).toContain(
      'import { app as taserApp } from "./routes.gen.js";',
    );

    writeFileSync(join(tempDir, "taserjs.config.ts"), "export default { extension: false };");
    await buildStart(createPlugin());
    expect(readFileSync(shim, "utf-8")).toContain(
      'import { app as taserApp } from "./routes.gen";',
    );
  });

  it("never asks vite to ignore the output directory", async () => {
    const config: any = { server: { watch: {} } };

    await viteConfig(createPlugin({}, "vite"), config, "serve");

    expect(config.server.watch.ignored).toBeUndefined();
  });

  describe("server mode", () => {
    const taserConfig = (server?: boolean) => resolveConfig(server === undefined ? {} : { server });

    it.each([
      [{ server: true }, taserConfig(false), true],
      [{ server: false }, taserConfig(true), false],
      [{}, taserConfig(false), false],
      [{}, taserConfig(true), true],
    ])("isServerMode precedence: option %j, config %#", (options, config, expected) => {
      expect(
        isServerMode({ options, config, viteConfig: { plugins: [{ name: "nitro:init" }] } }),
      ).toBe(expected);
    });

    it("falls back to the absence of a full-stack framework", () => {
      const options = {};
      const config = taserConfig();
      expect(isServerMode({ options, config })).toBe(true);
      expect(isServerMode({ options, config, viteConfig: { plugins: [] } })).toBe(true);
      expect(
        isServerMode({ options, config, viteConfig: { plugins: [{ name: "astro:server" }] } }),
      ).toBe(false);
    });

    it.each([
      "tanstack-react-start:config",
      "nitro:init",
      "react-router",
      "@remix-run/dev",
      "astro:server",
      "vite-plugin-sveltekit-compile",
    ])("detectFullStack recognizes %s", (name) => {
      expect(detectFullStack({ plugins: [[{ name }]] })).toBe(true);
    });

    it("detectFullStack can ignore Nitro to find a wrapping framework", () => {
      expect(detectFullStack({ plugins: [{ name: "nitro:init" }] }, true)).toBe(false);
      expect(detectFullStack({ plugins: [{ name: "tanstack-start" }] }, true)).toBe(true);
      expect(detectFullStack({ nitro: {} })).toBe(true);
      expect(detectFullStack({ nitro: {} }, true)).toBe(false);
      expect(detectFullStack(undefined)).toBe(false);
    });

    it.each([
      ["the server option", { server: false }, undefined, []],
      ["a full-stack framework plugin", {}, undefined, [{ name: "nitro:init" }]],
      ["taserjs.config", {}, "export default { server: false };", []],
    ])(
      "emits no shim and no build config when disabled by %s",
      async (_name, options, configSource, plugins) => {
        if (configSource) writeFileSync(join(tempDir, "taserjs.config.ts"), configSource);
        const plugin = createPlugin(options, "vite");

        expect(await viteConfig(plugin, { plugins })).toBeUndefined();
        await buildStart(plugin);

        expect(existsSync(join(outputDir, "serve.ts"))).toBe(false);
        expect(existsSync(join(outputDir, "routes.gen.ts"))).toBe(true);
      },
    );

    it("detects a framework whose plugins are still a promise when the config hook runs", async () => {
      // `sveltekit()` returns `Promise<Plugin[]>`, so its plugin names are not visible synchronously.
      const plugin = createPlugin({}, "vite");
      const plugins = [Promise.resolve([{ name: "vite-plugin-sveltekit-compile" }])];

      expect(await viteConfig(plugin, { plugins })).toBeUndefined();
      await buildStart(plugin);

      expect(existsSync(join(outputDir, "serve.ts"))).toBe(false);
    });

    it("lets server: true override full-stack detection", async () => {
      const plugin = createPlugin({ server: true }, "vite");

      const result = await viteConfig(plugin, { plugins: [{ name: "nitro:init" }] });
      await buildStart(plugin);

      expect(result.build.ssr).toBe(join(outputDir, "serve.ts"));
      expect(existsSync(join(outputDir, "serve.ts"))).toBe(true);
    });
  });

  describe("shouldRegenerate", () => {
    const paths = resolvePaths(resolveConfig(), "/work/app");

    it.each([
      ["/work/app/src/routes/users.get.ts", true],
      ["/work/app/src/routes/deep/er/$.ts", true],
      ["/work/app/src/taser.ts", true],
      ["/work/app/src/.taserjs/routes.gen.ts", false],
      ["/work/app/src/db.ts", false],
      ["/work/app/src/routes-other/x.ts", false],
    ])("%s -> %s", (file, expected) => {
      expect(shouldRegenerate(file, paths)).toBe(expected);
    });

    it("compares Windows-style paths", () => {
      const windowsPaths = resolvePaths(resolveConfig(), "C:/Users/alice/project");

      expect(
        shouldRegenerate("C:\\Users\\alice\\project\\src\\routes\\users\\$id.get.ts", windowsPaths),
      ).toBe(true);
      expect(
        shouldRegenerate("C:\\Users\\alice\\project\\src\\.taserjs\\routes.gen.ts", windowsPaths),
      ).toBe(false);
      expect(
        shouldRegenerate("D:\\Users\\alice\\project\\src\\routes\\users.get.ts", windowsPaths),
      ).toBe(false);
    });

    it("matches symlinked project roots against their real paths", () => {
      const linked = join(tempDir, "linked");
      symlinkSync(tempDir, linked);
      const linkedPaths = resolvePaths(resolveConfig(), linked);

      expect(shouldRegenerate(join(routesDir, "real.get.ts"), linkedPaths)).toBe(true);
    });
  });

  describe("host server detection", () => {
    const serverDir = () => join(tempDir, "src");
    const write = (name: string, dir = serverDir()) => {
      const file = join(dir, name);
      writeFileSync(file, "export default () => {};");
      return file;
    };

    it("returns null without a host entry", () => {
      expect(detectHostServer(serverDir())).toBeNull();
    });

    it.each([
      ["server.node.ts", "node"],
      ["server.cjs", "fetch"],
      ["server.ts", "fetch"],
    ])("detects %s as a %s host", (fileName, type) => {
      const path = write(fileName);
      expect(detectHostServer(serverDir())).toEqual({ type, path });
    });

    it("prefers a node host over a fetch host", () => {
      write("server.ts");
      const path = write("server.node.ts");
      expect(detectHostServer(serverDir())).toEqual({ type: "node", path });
    });

    it("honors an explicit entry and infers its type from the name", () => {
      const nodePath = write("custom.node.ts", tempDir);
      const fetchPath = write("custom-fetch.ts", tempDir);

      expect(detectHostServer(serverDir(), tempDir, "custom.node.ts")).toEqual({
        type: "node",
        path: nodePath,
      });
      expect(detectHostServer(serverDir(), tempDir, fetchPath)).toEqual({
        type: "fetch",
        path: fetchPath,
      });
    });
  });

  describe("generated entries", () => {
    const manifest = "./routes.gen.js";

    it("serve shim without a host just serves the app", () => {
      const code = serveShimSource(manifest);

      expect(code).toContain('import { FastResponse, serve } from "@taserjs/runtime/serve";');
      expect(code).toContain("serve(taserApp);");
      expect(code).not.toContain("mount");
    });

    it("serve shim mounts a node host through the runtime helper", () => {
      const host = relativeHostImport(
        { type: "node", path: join(tempDir, "src", "server.node.ts") },
        outputDir,
        ".js",
      );
      const code = serveShimSource(manifest, host);

      expect(code).toContain('import { mountNodeHost } from "@taserjs/runtime/serve/node";');
      expect(code).toContain('import hostEntry from "../server.node.js";');
      expect(code).toContain("mountNodeHost(taserApp, hostEntry);");
    });

    it("serve shim mounts a fetch host without importing node-only code", () => {
      const host = relativeHostImport(
        { type: "fetch", path: join(tempDir, "src", "server.ts") },
        outputDir,
        ".js",
      );
      const code = serveShimSource(manifest, host);

      expect(code).toContain("mountFetchHost(taserApp, hostEntry);");
      expect(code).not.toContain("serve/node");
    });

    it.each([
      ["standalone app", nitroStandaloneAppSource],
      ["handler", nitroHandlerSource],
    ])("nitro %s normalizes Windows-style paths and mounts the host", (_name, render) => {
      const code = render("C:\\Users\\alice\\project\\src\\.taserjs\\routes.gen.ts", {
        type: "fetch",
        specifier: "C:\\Users\\alice\\project\\src\\server.ts",
      });

      expect(code).toContain('from "C:/Users/alice/project/src/.taserjs/routes.gen.ts"');
      expect(code).toContain('import hostEntry from "C:/Users/alice/project/src/server.ts";');
      expect(code).toContain("mountFetchHost(taserApp, hostEntry);");
      expect(code).not.toContain("\\");
    });
  });
});

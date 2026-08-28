import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { promises as fsp } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import type { NextConfig } from "next";
import createTaser, { type NextConfigFn } from "../src/next.js";

const ORIGINAL_PHASE = process.env.NEXT_PHASE;

type WebpackConfigContext = Parameters<NonNullable<NextConfig["webpack"]>>[1];

function mockWebpackContext(overrides: Partial<WebpackConfigContext> = {}): WebpackConfigContext {
  return {
    dir: process.cwd(),
    dev: false,
    isServer: false,
    buildId: "test-build",
    config: {} as WebpackConfigContext["config"],
    defaultLoaders: { babel: {} },
    totalPages: 0,
    webpack: {},
    ...overrides,
  };
}

describe("Next.js adapter (createTaser / withTaser)", () => {
  let testDir: string;

  beforeEach(async () => {
    delete process.env.NEXT_PHASE;
    testDir = await fsp.mkdtemp(join(tmpdir(), "taser-next-test-"));
  });

  afterEach(async () => {
    if (ORIGINAL_PHASE === undefined) {
      delete process.env.NEXT_PHASE;
    } else {
      process.env.NEXT_PHASE = ORIGINAL_PHASE;
    }
    vi.restoreAllMocks();
    if (testDir) {
      await new Promise((r) => setTimeout(r, 50));
      await fsp.rm(testDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
    }
  });

  it("works with curried factory pattern (like @next/mdx)", () => {
    const withTaserCustom = createTaser({ rootDir: testDir, basePath: "/app" });
    const config = withTaserCustom({ reactStrictMode: true });
    expect(config.basePath).toBeUndefined();
    expect(config.reactStrictMode).toBe(true);
    expect(config.__taserRouterPlugin).toBe(true);
    expect(Object.keys(config)).not.toContain("__taserRouterPlugin");
    expect(config.turbopack?.resolveExtensions).toContain(".ts");
    expect(config.turbopack?.resolveExtensions).toContain(".tsx");
  });

  it("does not mutate next.js basePath with taser basePath but preserves explicit next.js basePath", () => {
    const withTaserCustom = createTaser({ rootDir: testDir, basePath: "/api" });
    const configWithCustomNextBase = withTaserCustom({ basePath: "/site", reactStrictMode: true });
    expect(configWithCustomNextBase.basePath).toBe("/site");

    const configWithoutNextBase = withTaserCustom({ reactStrictMode: true });
    expect(configWithoutNextBase.basePath).toBeUndefined();
  });

  it("is idempotent — double wrapping returns the same config", () => {
    const withTaserCustom = createTaser({ rootDir: testDir });
    const wrapped = withTaserCustom({});
    const again = withTaserCustom(wrapped);
    expect(again).toBe(wrapped);
  });

  it("handles sync function-based next.config", async () => {
    const withTaserCustom = createTaser({ rootDir: testDir, basePath: "/api" });
    const rawFn: NextConfigFn = (_phase, { defaultConfig }) => ({
      ...defaultConfig,
      reactStrictMode: true,
    });

    const wrappedFn = withTaserCustom(rawFn);
    expect(typeof wrappedFn).toBe("function");

    const result = await (wrappedFn as NextConfigFn)("PHASE_PRODUCTION_BUILD", {
      defaultConfig: { basePath: "/custom" },
    });
    expect(result.basePath).toBe("/custom");
    expect(result.reactStrictMode).toBe(true);
    expect(result.__taserRouterPlugin).toBe(true);
    expect(Object.keys(result)).not.toContain("__taserRouterPlugin");
    expect(result.turbopack?.resolveExtensions).toContain(".ts");
  });

  it("handles async function-based next.config", async () => {
    const withTaserCustom = createTaser({ rootDir: testDir });
    const rawFn: NextConfigFn = async () => {
      await Promise.resolve();
      return { poweredByHeader: false };
    };

    const wrappedFn = withTaserCustom(rawFn);
    const result = await (wrappedFn as NextConfigFn)("PHASE_PRODUCTION_BUILD", {
      defaultConfig: {},
    });
    expect(result.poweredByHeader).toBe(false);
    expect(result.__taserRouterPlugin).toBe(true);
    expect(Object.keys(result)).not.toContain("__taserRouterPlugin");
    expect(result.turbopack?.resolveExtensions).toContain(".ts");
  });

  it("preserves custom typed NextConfig options without type casting", () => {
    const withTaserCustom = createTaser({ rootDir: testDir });
    const customConfig = {
      reactCompiler: true,
      headers: () => [{ source: "/api/:path*", headers: [{ key: "x-custom", value: "1" }] }],
    };
    const config = withTaserCustom(customConfig);
    expect(config.reactCompiler).toBe(true);
    expect(typeof config.headers).toBe("function");
    expect(config.turbopack?.resolveExtensions).toContain(".ts");
  });

  it("supports plugin chaining with other wrappers", () => {
    const withDummy = <T extends object>(cfg: T) => ({ ...cfg, dummy: true });
    const withTaserCustom = createTaser({ rootDir: testDir, basePath: "/chained" });

    const finalConfig = withDummy(withTaserCustom({ reactStrictMode: true }));
    expect(finalConfig.basePath).toBeUndefined();
    expect(finalConfig.reactStrictMode).toBe(true);
    expect(finalConfig.dummy).toBe(true);
  });

  it("configures Turbopack resolveExtensions for Next 16 turbopack and Next 14/15 experimental.turbo", () => {
    const withTaserCustom = createTaser({ rootDir: testDir });
    const config = withTaserCustom({
      turbopack: { resolveExtensions: [".custom"] },
      experimental: { turbo: { resolveExtensions: [".custom2"] } },
    });

    expect(config.turbopack?.resolveExtensions).toContain(".ts");
    expect(config.turbopack?.resolveExtensions).toContain(".tsx");
    expect(config.turbopack?.resolveExtensions).toContain(".custom");

    expect(config.experimental?.turbo?.resolveExtensions).toContain(".ts");
    expect(config.experimental?.turbo?.resolveExtensions).toContain(".tsx");
    expect(config.experimental?.turbo?.resolveExtensions).toContain(".custom2");
  });

  it("wraps an existing webpack callback and safely merges extension aliasing", async () => {
    const webpack = vi.fn((config: unknown) => config);
    const withTaserCustom = createTaser({ rootDir: testDir });
    const config = withTaserCustom({
      webpack,
    });
    expect(config.webpack).not.toBe(webpack);

    const result = (await config.webpack?.(
      { resolve: { alias: {} } },
      mockWebpackContext({ dir: testDir }),
    )) as {
      resolve: { extensionAlias?: Record<string, string[]>; alias?: Record<string, string> };
    };

    expect(webpack).toHaveBeenCalledTimes(1);
    expect(result.resolve.alias).toEqual({});
    expect(result.resolve.extensionAlias?.[".js"]).toEqual([".ts", ".tsx", ".js"]);
  });

  it("does not clobber user extensionAlias entries during webpack merge", async () => {
    const withTaserCustom = createTaser({ rootDir: testDir });
    const config = withTaserCustom({
      webpack: (config: unknown) =>
        ({
          ...(config as object),
          resolve: { extensionAlias: { ".js": [".mjs", ".js"] } },
        }) as unknown,
    });

    const result = (await config.webpack?.({}, mockWebpackContext({ dir: testDir }))) as {
      resolve: { extensionAlias: Record<string, string[]> };
    };
    expect(result.resolve.extensionAlias[".js"]).toEqual([".ts", ".tsx", ".js", ".mjs"]);
  });

  it("uses taser basePath for entry artifacts without combining next.js basePath", async () => {
    const routesDir = join(testDir, "src", "server", "routes");
    await fsp.mkdir(routesDir, { recursive: true });
    await fsp.writeFile(
      join(routesDir, "index.get.ts"),
      'export const Route = t.get("/").handler(() => new Response("ok"));',
      "utf8",
    );

    const withTaserCustom = createTaser({
      rootDir: testDir,
      serverDir: "src/server",
      basePath: "/api",
    });
    const config = withTaserCustom({ basePath: "/site" });
    expect(config.basePath).toBe("/site");

    const entryFile = join(testDir, ".taser", "entry.ts");
    const appFile = join(testDir, ".taser", "app.ts");

    const waitForFiles = async (
      attempts = 0,
    ): Promise<{ entryContent: string; appContent: string }> => {
      try {
        const [entryContent, appContent] = await Promise.all([
          fsp.readFile(entryFile, "utf8"),
          fsp.readFile(appFile, "utf8"),
        ]);
        return { entryContent, appContent };
      } catch (err) {
        if (attempts >= 20) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, 50));
        return waitForFiles(attempts + 1);
      }
    };

    const { entryContent, appContent } = await waitForFiles();
    expect(entryContent).toContain('basePath: "/api"');
    expect(entryContent).not.toContain('basePath: "/site/api"');
    expect(appContent).toContain('const __scope = "/api";');
  });

  it("runs generation outside the dev phase without registering a watcher", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const withTaserCustom = createTaser({ rootDir: "/nonexistent-taser-root-xyz" });
    const config = withTaserCustom({});
    await config.webpack?.({}, mockWebpackContext());

    expect(error).toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("watches and auto-scaffolds newly created route files in development phase", async () => {
    const routesDir = join(testDir, "src", "server", "routes");
    await fsp.mkdir(routesDir, { recursive: true });
    await fsp.writeFile(
      join(routesDir, "index.get.ts"),
      'export const Route = t.get("/").handler(() => new Response("ok"));',
      "utf8",
    );

    const withTaserCustom = createTaser({
      rootDir: testDir,
      serverDir: "src/server",
      basePath: "/api",
      watcher: { debounceMs: 20 },
    });

    // Invoke in dev phase ("phase-development-server")
    const configFn = withTaserCustom(() => ({}));
    await (configFn as NextConfigFn)("phase-development-server", { defaultConfig: {} });

    // Allow watcher to finish initial scan
    await new Promise((r) => setTimeout(r, 200));

    const newRouteFile = join(routesDir, "users.get.ts");
    await fsp.writeFile(newRouteFile, "", "utf8");

    const manifestFile = join(testDir, ".taser", "manifest.ts");

    const waitForScaffoldAndManifest = async (
      attempts = 0,
    ): Promise<{ content: string; manifest: string }> => {
      try {
        const [content, manifest] = await Promise.all([
          fsp.readFile(newRouteFile, "utf8"),
          fsp.readFile(manifestFile, "utf8"),
        ]);
        if (content.length > 0 && manifest.includes("users")) {
          return { content, manifest };
        }
        throw new Error("Not ready yet");
      } catch (err) {
        if (attempts >= 40) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, 50));
        return waitForScaffoldAndManifest(attempts + 1);
      }
    };

    const { content, manifest } = await waitForScaffoldAndManifest();
    expect(content).toContain("export const Route =");
    expect(content).toContain("t.get('/users')");
    expect(manifest).toContain("users.get");
  });
});

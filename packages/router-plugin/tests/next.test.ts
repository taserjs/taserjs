import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import createTaser, { type NextConfigFn } from "../src/next.js";

const ORIGINAL_PHASE = process.env.NEXT_PHASE;

describe("Next.js adapter (createTaser / withTaser)", () => {
  beforeEach(() => {
    delete process.env.NEXT_PHASE;
  });

  afterEach(() => {
    if (ORIGINAL_PHASE === undefined) {
      delete process.env.NEXT_PHASE;
    } else {
      process.env.NEXT_PHASE = ORIGINAL_PHASE;
    }
    vi.restoreAllMocks();
  });

  it("works with curried factory pattern (like @next/mdx)", () => {
    const withTaserCustom = createTaser({ basePath: "/app" });
    const config = withTaserCustom({ reactStrictMode: true });
    expect(config.basePath).toBe("/app");
    expect(config.reactStrictMode).toBe(true);
    expect(config.__taserRouterPlugin).toBe(true);
  });

  it("is idempotent — double wrapping returns the same config", () => {
    const withTaserCustom = createTaser();
    const wrapped = withTaserCustom({});
    const again = withTaserCustom(wrapped);
    expect(again).toBe(wrapped);
  });

  it("handles sync function-based next.config", async () => {
    const withTaserCustom = createTaser({ basePath: "/api" });
    const rawFn: NextConfigFn = (_phase, { defaultConfig }) => ({
      ...defaultConfig,
      reactStrictMode: true,
    });

    const wrappedFn = withTaserCustom(rawFn);
    expect(typeof wrappedFn).toBe("function");

    const result = await (wrappedFn as NextConfigFn)("PHASE_PRODUCTION_BUILD", {
      defaultConfig: { basePath: "/" },
    });
    expect(result.basePath).toBe("/api");
    expect(result.reactStrictMode).toBe(true);
    expect(result.__taserRouterPlugin).toBe(true);
  });

  it("handles async function-based next.config", async () => {
    const withTaserCustom = createTaser();
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
  });

  it("supports plugin chaining with other wrappers", () => {
    const withDummy = <T extends object>(cfg: T) => ({ ...cfg, dummy: true });
    const withTaserCustom = createTaser({ basePath: "/chained" });

    const finalConfig = withDummy(withTaserCustom({ reactStrictMode: true }));
    expect(finalConfig.basePath).toBe("/chained");
    expect(finalConfig.reactStrictMode).toBe(true);
    expect(finalConfig.dummy).toBe(true);
  });

  it("configures Turbopack resolveExtensions for Next 16 turbopack and Next 14/15 experimental.turbo", () => {
    const withTaserCustom = createTaser();
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
    const withTaserCustom = createTaser();
    const config = withTaserCustom({
      webpack,
    });
    expect(config.webpack).not.toBe(webpack);

    const result = (await config.webpack?.({ resolve: { alias: {} } }, {})) as {
      resolve: { extensionAlias?: Record<string, string[]>; alias?: Record<string, string> };
    };

    expect(webpack).toHaveBeenCalledTimes(1);
    expect(result.resolve.alias).toEqual({});
    expect(result.resolve.extensionAlias?.[".js"]).toEqual([".ts", ".tsx", ".js"]);
  });

  it("does not clobber user extensionAlias entries during webpack merge", async () => {
    const withTaserCustom = createTaser();
    const config = withTaserCustom({
      webpack: (config: unknown) =>
        ({
          ...(config as object),
          resolve: { extensionAlias: { ".js": [".mjs", ".js"] } },
        }) as unknown,
    });

    const result = (await config.webpack?.({}, {})) as {
      resolve: { extensionAlias: Record<string, string[]> };
    };
    expect(result.resolve.extensionAlias[".js"]).toEqual([".ts", ".tsx", ".js", ".mjs"]);
  });

  it("runs generation outside the dev phase without registering a watcher", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const withTaserCustom = createTaser({ rootDir: "/nonexistent-taser-root-xyz" });
    const config = withTaserCustom({});
    await config.webpack?.({}, {});

    expect(error).toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});

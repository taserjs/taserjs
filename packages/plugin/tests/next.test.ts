import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { closeTaserWatcher, createTaser } from "../src/next.js";

describe("@taserjs/plugin next adapter", () => {
  let tempDir: string;
  let manifestFile: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "taser-next-test-"));
    const routesDir = join(tempDir, "src", "server", "routes");
    manifestFile = join(tempDir, "src", "server", ".taserjs", "routes.gen.ts");
    mkdirSync(routesDir, { recursive: true });

    writeFileSync(
      join(tempDir, "taserjs.config.ts"),
      'export default { serverDir: "src/server" };\n',
    );
    writeFileSync(
      join(routesDir, "ping.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/ping").handler(() => Response.json({ ping: "pong" }));\n',
    );
  });

  afterEach(async () => {
    await closeTaserWatcher();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("generates the manifest on config load and keeps the user's config", async () => {
    const userWebpack = vi.fn((config: any) => ({ ...config, touched: true }));
    const enhanced: any = createTaser({ cwd: tempDir })({
      reactStrictMode: true,
      webpack: userWebpack,
    });

    await vi.waitFor(() => expect(existsSync(manifestFile)).toBe(true));
    expect(enhanced.reactStrictMode).toBe(true);
    expect(enhanced.turbopack).toEqual({});

    const webpackConfig = enhanced.webpack({ plugins: ["existing"] }, { dev: true });
    expect(userWebpack).toHaveBeenCalledOnce();
    expect(webpackConfig.touched).toBe(true);
    expect(webpackConfig.plugins).toHaveLength(2);
  });

  describe("function configs", () => {
    const phase = "phase-development-server";

    it("keeps the settings a sync function config returns", async () => {
      const userWebpack = vi.fn((config: any) => ({ ...config, touched: true }));
      const enhanced = createTaser({ cwd: tempDir })((receivedPhase: string) => ({
        reactStrictMode: receivedPhase === phase,
        webpack: userWebpack,
      }));

      expect(typeof enhanced).toBe("function");
      const config: any = await enhanced(phase, { defaultConfig: {} as any });

      expect(config.reactStrictMode).toBe(true);
      expect(config.turbopack).toEqual({});
      expect(config.webpack({ plugins: [] }, {}).touched).toBe(true);
      expect(userWebpack).toHaveBeenCalledOnce();
    });

    it("keeps the settings an async function config resolves to", async () => {
      const enhanced = createTaser({ cwd: tempDir })(async () => ({
        reactStrictMode: true,
        turbopack: { root: "/" },
      }));

      const config: any = await enhanced(phase, { defaultConfig: {} as any });

      expect(config.reactStrictMode).toBe(true);
      expect(config.turbopack).toEqual({ root: "/" });
      expect(config.webpack({}, {}).plugins).toHaveLength(1);
    });

    it("passes Next's phase and default config through to the user's function", async () => {
      const userConfig = vi.fn(() => ({}));
      const defaultConfig = { reactStrictMode: false };

      await createTaser({ cwd: tempDir })(userConfig)(phase, { defaultConfig });

      expect(userConfig).toHaveBeenCalledWith(phase, { defaultConfig });
    });

    it("still generates the manifest on config load", async () => {
      createTaser({ cwd: tempDir })(() => ({}));

      await vi.waitFor(() => expect(existsSync(manifestFile)).toBe(true));
    });
  });

  it("keeps watching after a failed first generation so fixing the route regenerates", async () => {
    const brokenRoute = join(tempDir, "src", "server", "routes", "ping.get.ts");
    const validSource = readFileSync(brokenRoute, "utf-8");
    writeFileSync(brokenRoute, "export const notARoute = 1;\n");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    createTaser({ cwd: tempDir })();
    await vi.waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(existsSync(manifestFile)).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 500));
    writeFileSync(brokenRoute, validSource);
    await vi.waitFor(() => expect(existsSync(manifestFile)).toBe(true), { timeout: 5000 });

    consoleError.mockRestore();
  });

  it("injects the webpack plugin when the user has no webpack hook", () => {
    const enhanced: any = createTaser({ cwd: tempDir })();

    expect(enhanced.webpack({}, {}).plugins).toHaveLength(1);
  });
});

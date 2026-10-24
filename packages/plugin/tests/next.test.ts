import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

  it("injects the webpack plugin when the user has no webpack hook", () => {
    const enhanced: any = createTaser({ cwd: tempDir })();

    expect(enhanced.webpack({}, {}).plugins).toHaveLength(1);
  });
});

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeTurbopackWatcher, createTaser, runNextTaserGeneration, withTaser } from "../src/next.js";

describe("@taserjs/plugin next adapter", () => {
  let tempDir: string;
  let serverDir: string;
  let routesDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "taser-next-test-"));
    serverDir = join(tempDir, "src", "server");
    routesDir = join(serverDir, "routes");
    mkdirSync(routesDir, { recursive: true });

    // Write a dummy route
    writeFileSync(
      join(routesDir, "ping.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/ping").handler(() => Response.json({ ping: "pong" }));\n',
      "utf-8",
    );
  });

  afterEach(async () => {
    await closeTurbopackWatcher();
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("exports createTaser and withTaser", () => {
    expect(typeof createTaser).toBe("function");
    expect(typeof withTaser).toBe("function");
  });

  it("executes route generation and injects webpack plugin", async () => {
    await runNextTaserGeneration(tempDir, { serverDir: "src/server" });
    expect(existsSync(join(serverDir, ".taserjs", "routes.gen.ts"))).toBe(true);

    const withTaserWrapper = createTaser({ cwd: tempDir, serverDir: "src/server" });
    const originalConfig = {
      reactStrictMode: true,
      webpack(config: any) {
        return config;
      },
    };

    const enhanced = withTaserWrapper(originalConfig);
    expect(enhanced.reactStrictMode).toBe(true);
    expect(typeof enhanced.webpack).toBe("function");

    const mockWebpackConfig: any = { plugins: [] };
    const resultWebpack = enhanced.webpack(mockWebpackConfig);

    expect(resultWebpack.plugins.length).toBeGreaterThan(0);
  });
});

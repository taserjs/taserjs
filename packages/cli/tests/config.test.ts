import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, defineConfig, loadConfig } from "../src/config.js";

describe("cli config loader", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "taser-config-test-"));
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("defineConfig returns the configuration object", () => {
    const config = defineConfig({
      routesDir: "./custom/routes",
      outputDir: "./custom/out",
      basePath: "/api/v1",
      extensions: ["ts"],
      formatting: { quotes: "single" },
    });

    expect(config).toEqual({
      routesDir: "./custom/routes",
      outputDir: "./custom/out",
      basePath: "/api/v1",
      extensions: ["ts"],
      formatting: { quotes: "single" },
    });
  });

  it("loads default config when no config file exists", async () => {
    const loaded = await loadConfig(tempDir);
    expect(loaded).toEqual({
      ...DEFAULT_CONFIG,
      configFile: undefined,
    });
  });

  it("loads taserjs.config.ts when present", async () => {
    const configContent = `
export default {
  routesDir: "./api/routes",
  outputDir: "./.gen",
  basePath: "/v2",
  formatting: { quotes: "single" },
};
`;
    writeFileSync(join(tempDir, "taserjs.config.ts"), configContent, "utf-8");

    const loaded = await loadConfig(tempDir);
    expect(loaded.routesDir).toBe("./api/routes");
    expect(loaded.outputDir).toBe("./.gen");
    expect(loaded.basePath).toBe("/v2");
    expect(loaded.formatting.quotes).toBe("single");
    expect(loaded.configFile).toBe(join(tempDir, "taserjs.config.ts"));
  });

  it("throws when a specified custom config file is not found", async () => {
    await expect(loadConfig(tempDir, "./nonexistent.config.ts")).rejects.toThrow(
      /Config file not found/,
    );
  });
});

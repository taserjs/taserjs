import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  defineConfig,
  loadConfig,
  resolveAppFile,
  resolveOutputDir,
  resolveRoutesDir,
  resolveServerDir,
} from "../src/config.js";

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

  it("defineConfig returns defaults for routesDir, outputDir, extensions, and formatting when empty", () => {
    const config = defineConfig();
    expect(config.routesDir).toBe("routes");
    expect(config.outputDir).toBe(".taserjs");
    expect(config.extensions).toEqual(["ts", "tsx"]);
    expect(config.formatting).toEqual({ quotes: "double" });
  });

  it("defineConfig merges user options with defaults", () => {
    const config = defineConfig({
      routesDir: "api",
      formatting: { quotes: "single" },
    });
    expect(config.routesDir).toBe("api");
    expect(config.outputDir).toBe(".taserjs");
    expect(config.extensions).toEqual(["ts", "tsx"]);
    expect(config.formatting).toEqual({ quotes: "single" });
  });

  it("defineConfig returns the configuration object when all options are specified", () => {
    const config = defineConfig({
      serverDir: "src",
      routesDir: "routes",
      outputDir: ".taserjs",
      app: "taser.ts",
      extensions: ["ts"],
      formatting: { quotes: "single" },
    });

    expect(config).toEqual({
      serverDir: "src",
      routesDir: "routes",
      outputDir: ".taserjs",
      app: "taser.ts",
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
    expect(loaded.serverDir).toBe("src");
    expect(loaded.routesDir).toBe("routes");
    expect(loaded.outputDir).toBe(".taserjs");
    expect(loaded.app).toBe("taser.ts");
  });

  it("loads taserjs.config.ts when present", async () => {
    const configContent = `
export default {
  serverDir: "server",
  routesDir: "api",
  outputDir: ".taser",
  app: "app.ts",
  formatting: { quotes: "single" },
};
`;
    writeFileSync(join(tempDir, "taserjs.config.ts"), configContent, "utf-8");

    const loaded = await loadConfig(tempDir);
    expect(loaded.serverDir).toBe("server");
    expect(loaded.routesDir).toBe("api");
    expect(loaded.outputDir).toBe(".taser");
    expect(loaded.app).toBe("app.ts");
    expect(loaded.formatting.quotes).toBe("single");
    expect(loaded.configFile).toBe(join(tempDir, "taserjs.config.ts"));
  });

  it("loads taserjs.config.mjs when present", async () => {
    const configContent = `
export default {
  routesDir: "mjs-routes",
  outputDir: ".taser-mjs",
};
`;
    writeFileSync(join(tempDir, "taserjs.config.mjs"), configContent, "utf-8");

    const loaded = await loadConfig(tempDir);
    expect(loaded.routesDir).toBe("mjs-routes");
    expect(loaded.outputDir).toBe(".taser-mjs");
    expect(loaded.serverDir).toBe("src"); // fallback
    expect(loaded.configFile).toBe(join(tempDir, "taserjs.config.mjs"));
  });

  it("loads taserjs.config.cjs with module.exports", async () => {
    const configContent = `
module.exports = {
  routesDir: "cjs-routes",
};
`;
    writeFileSync(join(tempDir, "taserjs.config.cjs"), configContent, "utf-8");

    const loaded = await loadConfig(tempDir);
    expect(loaded.routesDir).toBe("cjs-routes");
    expect(loaded.outputDir).toBe(".taserjs");
    expect(loaded.configFile).toBe(join(tempDir, "taserjs.config.cjs"));
  });

  it("supports config exported as a function or async function", async () => {
    const configContent = `
export default async () => ({
  routesDir: "async-routes",
  formatting: { quotes: "single" },
});
`;
    writeFileSync(join(tempDir, "taserjs.config.ts"), configContent, "utf-8");

    const loaded = await loadConfig(tempDir);
    expect(loaded.routesDir).toBe("async-routes");
    expect(loaded.formatting.quotes).toBe("single");
  });

  it("resolves paths relative to workspace root using serverDir", () => {
    const config = {
      ...DEFAULT_CONFIG,
      serverDir: "src",
      routesDir: "routes",
      outputDir: ".taserjs",
      app: "taser.ts",
    };

    expect(resolveServerDir(config, tempDir)).toBe(join(tempDir, "src"));
    expect(resolveRoutesDir(config, tempDir)).toBe(join(tempDir, "src", "routes"));
    expect(resolveOutputDir(config, tempDir)).toBe(join(tempDir, "src", ".taserjs"));
    expect(resolveAppFile(config, tempDir)).toBe(join(tempDir, "src", "taser.ts"));
  });

  it("throws when a specified custom config file is not found", async () => {
    await expect(loadConfig(tempDir, "./nonexistent.config.ts")).rejects.toThrow(
      /Config file not found/,
    );
  });
});

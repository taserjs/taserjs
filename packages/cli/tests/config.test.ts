import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  defineConfig,
  loadConfig,
  resolveAppFile,
  resolveImportExtension,
  resolveOutputDir,
  resolveRoutesDir,
  resolveServerDir,
} from "../src/config.js";
import { ROUTE_EXTENSIONS } from "../src/paths.js";

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

  it("defineConfig returns defaults for routesDir, outputDir, and formatting when empty", () => {
    const config = defineConfig();
    expect(config.routesDir).toBe("routes");
    expect(config.outputDir).toBe(".taserjs");
    expect(config.extension).toBe(true);
    expect(config.formatting).toEqual({ quotes: "double" });
  });

  it("defineConfig merges user options with defaults", () => {
    const config = defineConfig({
      routesDir: "api",
      extension: false,
      formatting: { quotes: "single" },
    });
    expect(config.routesDir).toBe("api");
    expect(config.outputDir).toBe(".taserjs");
    expect(config.extension).toBe(false);
    expect(config.formatting).toEqual({ quotes: "single" });
  });

  it("exports ROUTE_EXTENSIONS constant", () => {
    expect(ROUTE_EXTENSIONS).toEqual(["ts", "tsx"]);
  });

  it("resolveImportExtension handles booleans and strings correctly", () => {
    expect(resolveImportExtension(true)).toBe(".js");
    expect(resolveImportExtension(false)).toBe("");
    expect(resolveImportExtension("js")).toBe(".js");
    expect(resolveImportExtension(".js")).toBe(".js");
    expect(resolveImportExtension("..js")).toBe(".js");
    expect(resolveImportExtension("mjs")).toBe(".mjs");
    expect(resolveImportExtension(".ts")).toBe(".ts");
    expect(resolveImportExtension("")).toBe("");
    expect(resolveImportExtension(undefined)).toBe(".js");
  });

  it("defineConfig returns the configuration object when all options are specified", () => {
    const config = defineConfig({
      serverDir: "src",
      routesDir: "routes",
      outputDir: ".taserjs",
      app: "taser.ts",
      extension: "js",
      formatting: { quotes: "single" },
    });

    expect(config).toEqual({
      serverDir: "src",
      routesDir: "routes",
      outputDir: ".taserjs",
      app: "taser.ts",
      extension: "js",
      formatting: { quotes: "single" },
    });
  });

  it("defineConfig preserves server option when provided", () => {
    const configDisabled = defineConfig({ server: false });
    expect(configDisabled.server).toBe(false);

    const configEnabled = defineConfig({ server: true });
    expect(configEnabled.server).toBe(true);
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
  server: false,
  serverDir: "server",
  routesDir: "api",
  outputDir: ".taser",
  app: "app.ts",
  extension: "mjs",
  formatting: { quotes: "single" },
};
`;
    writeFileSync(join(tempDir, "taserjs.config.ts"), configContent, "utf-8");

    const loaded = await loadConfig(tempDir);
    expect(loaded.server).toBe(false);
    expect(loaded.serverDir).toBe("server");
    expect(loaded.routesDir).toBe("api");
    expect(loaded.outputDir).toBe(".taser");
    expect(loaded.app).toBe("app.ts");
    expect(loaded.extension).toBe("mjs");
    expect(loaded.formatting.quotes).toBe("single");
    expect(loaded.configFile).toBe(join(tempDir, "taserjs.config.ts"));
  });

  it("loads taserjs.config.js when present", async () => {
    const configContent = `
export default {
  serverDir: "server",
  routesDir: "routes-js",
  outputDir: ".taser-js",
};
`;
    writeFileSync(join(tempDir, "taserjs.config.js"), configContent, "utf-8");

    const loaded = await loadConfig(tempDir);
    expect(loaded.routesDir).toBe("routes-js");
    expect(loaded.outputDir).toBe(".taser-js");
    expect(loaded.configFile).toBe(join(tempDir, "taserjs.config.js"));
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

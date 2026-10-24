import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defineConfig, loadConfig, resolveConfig, resolvePaths } from "../src/config.js";

describe("cli config", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "taser-config-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("defineConfig returns its argument untouched", () => {
    const config = { routesDir: "api" };
    expect(defineConfig(config)).toBe(config);
  });

  it("resolveConfig fills defaults once", () => {
    expect(resolveConfig()).toEqual({
      serverDir: "src",
      routesDir: "routes",
      outputDir: ".taserjs",
      app: "taser.ts",
      importExt: ".js",
    });
  });

  it.each([
    [true, ".js"],
    [false, ""],
    ["mjs", ".mjs"],
    [".mjs", ".mjs"],
    ["  ", ""],
  ])("extension %j becomes import suffix %j", (extension, importExt) => {
    expect(resolveConfig({ extension }).importExt).toBe(importExt);
  });

  it("loads defaults when no config file exists", async () => {
    expect(await loadConfig(tempDir)).toEqual(resolveConfig());
  });

  it.each([
    ["taserjs.config.ts", "export default { routesDir: 'ts-routes', server: false };"],
    ["taserjs.config.js", "export default { routesDir: 'ts-routes', server: false };"],
    ["taserjs.config.mjs", "export default { routesDir: 'ts-routes', server: false };"],
    ["taserjs.config.cjs", "module.exports = { routesDir: 'ts-routes', server: false };"],
    [
      "taserjs.config.ts",
      "export default async () => ({ routesDir: 'ts-routes', server: false });",
    ],
  ])("loads %s", async (fileName, source) => {
    writeFileSync(join(tempDir, fileName), source, "utf-8");

    const loaded = await loadConfig(tempDir);
    expect(loaded).toMatchObject({
      routesDir: "ts-routes",
      server: false,
      outputDir: ".taserjs",
      configFile: join(tempDir, fileName),
    });
  });

  it("throws when a specified config file is missing", async () => {
    await expect(loadConfig(tempDir, "./nonexistent.config.ts")).rejects.toThrow(
      /Config file not found/,
    );
  });

  it("wraps errors thrown while evaluating the config", async () => {
    writeFileSync(join(tempDir, "taserjs.config.ts"), "throw new Error('boom');", "utf-8");
    await expect(loadConfig(tempDir)).rejects.toThrow(/Failed to load config file .*boom/);
  });

  describe("resolvePaths", () => {
    it("resolves everything relative to serverDir", () => {
      expect(resolvePaths(resolveConfig(), tempDir)).toEqual({
        serverDir: join(tempDir, "src"),
        routesDir: join(tempDir, "src", "routes"),
        outputDir: join(tempDir, "src", ".taserjs"),
        appFile: join(tempDir, "src", "taser.ts"),
        manifestFile: join(tempDir, "src", ".taserjs", "routes.gen.ts"),
      });
    });

    it("keeps absolute Windows-style overrides and normalizes backslashes", () => {
      const cwd = "C:/Users/alice/project";
      const paths = resolvePaths(
        resolveConfig({
          routesDir: "D:\\custom\\routes",
          outputDir: "gen\\out",
          app: "D:\\custom\\app.ts",
        }),
        cwd,
      );

      expect(paths.routesDir).toBe("D:/custom/routes");
      expect(paths.outputDir).toBe("C:/Users/alice/project/src/gen/out");
      expect(paths.appFile).toBe("D:/custom/app.ts");
    });
  });
});

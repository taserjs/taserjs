import { describe, expect, it } from "vitest";

import { taserUnplugin } from "../src/core/unplugin.js";
import vitePlugin from "../src/vite.js";
import webpackPlugin from "../src/webpack.js";
import rspackPlugin from "../src/rspack.js";
import rollupPlugin from "../src/rollup.js";
import rolldownPlugin from "../src/rolldown.js";
import esbuildPlugin from "../src/esbuild.js";

function getSinglePlugin(plugin: unknown): Record<string, any> {
  return (Array.isArray(plugin) ? plugin[0] : plugin) as Record<string, any>;
}

describe("unplugin multi-bundler exports", () => {
  it("exports universal unplugin factory from core", () => {
    expect(typeof taserUnplugin).toBe("object");
    expect(typeof taserUnplugin.vite).toBe("function");
    expect(typeof taserUnplugin.webpack).toBe("function");
    expect(typeof taserUnplugin.rspack).toBe("function");
    expect(typeof taserUnplugin.rollup).toBe("function");
    expect(typeof taserUnplugin.rolldown).toBe("function");
    expect(typeof taserUnplugin.esbuild).toBe("function");
  });

  it("exports specialized vite plugin", () => {
    expect(typeof vitePlugin).toBe("function");
    const plugin = getSinglePlugin(vitePlugin());
    expect(plugin.name).toBe("taser");
    expect(typeof plugin.resolveId).toBe("function");
    expect(typeof plugin.load).toBe("function");
    expect(typeof plugin.buildStart).toBe("function");

    // Standalone build config includes ssr.noExternal
    const buildConfig = plugin.config({}, { command: "build" });
    expect(buildConfig?.ssr?.noExternal).toContain("@taserjs/router-plugin");
    expect(buildConfig?.build?.ssr).toBeDefined();

    // Nitro config skips standalone build overrides
    const nitroConfig = plugin.config({ nitro: {} }, { command: "build" });
    expect(nitroConfig).toBeUndefined();

    // Accepts standalone option and passes to nitro hook
    const pluginWithStandalone = getSinglePlugin(vitePlugin({ standalone: false }));
    expect(pluginWithStandalone.name).toBe("taser");
    expect(typeof pluginWithStandalone.nitro?.setup).toBe("function");
  });

  it("exports specialized webpack plugin", () => {
    expect(typeof webpackPlugin).toBe("function");
    const plugin = getSinglePlugin(webpackPlugin());
    expect(typeof plugin.apply).toBe("function");
  });

  it("exports specialized rspack plugin", () => {
    expect(typeof rspackPlugin).toBe("function");
    const plugin = getSinglePlugin(rspackPlugin());
    expect(typeof plugin.apply).toBe("function");
  });

  it("exports specialized rollup plugin", () => {
    expect(typeof rollupPlugin).toBe("function");
    const plugin = getSinglePlugin(rollupPlugin());
    expect(plugin.name).toBe("taser");
  });

  it("exports specialized rolldown plugin", () => {
    expect(typeof rolldownPlugin).toBe("function");
    const plugin = getSinglePlugin(rolldownPlugin());
    expect(plugin.name).toBe("taser");
  });

  it("exports specialized esbuild plugin", () => {
    expect(typeof esbuildPlugin).toBe("function");
    const plugin = getSinglePlugin(esbuildPlugin());
    expect(plugin.name).toBe("taser");
    expect(typeof plugin.setup).toBe("function");
  });
});

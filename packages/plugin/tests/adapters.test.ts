import { describe, expect, it } from "vitest";
import vitePlugin, { taser as viteTaser } from "../src/vite.js";
import rollupPlugin, { taser as rollupTaser } from "../src/rollup.js";
import webpackPlugin, { taser as webpackTaser } from "../src/webpack.js";
import rspackPlugin, { taser as rspackTaser } from "../src/rspack.js";
import esbuildPlugin, { taser as esbuildTaser } from "../src/esbuild.js";
import nitroPlugin, { taser as nitroTaser } from "../src/nitro.js";

describe("bundler plugin subpath adapters", () => {
  it("vite adapter exports default and named taser functions", () => {
    expect(typeof vitePlugin).toBe("function");
    expect(typeof viteTaser).toBe("function");
    const plugin = viteTaser();
    const name = Array.isArray(plugin) ? plugin[0]?.name : plugin.name;
    expect(name).toBe("taserjs:plugin");
  });

  it("rollup adapter exports default and named taser functions", () => {
    expect(typeof rollupPlugin).toBe("function");
    expect(typeof rollupTaser).toBe("function");
    const plugin = rollupTaser();
    const name = Array.isArray(plugin) ? plugin[0]?.name : plugin.name;
    expect(name).toBe("taserjs:plugin");
  });

  it("webpack adapter exports default and named taser functions", () => {
    expect(typeof webpackPlugin).toBe("function");
    expect(typeof webpackTaser).toBe("function");
    const plugin = webpackTaser();
    expect(typeof plugin.apply).toBe("function");
  });

  it("rspack adapter exports default and named taser functions", () => {
    expect(typeof rspackPlugin).toBe("function");
    expect(typeof rspackTaser).toBe("function");
    const plugin = rspackTaser();
    expect(typeof plugin.apply).toBe("function");
  });

  it("esbuild adapter exports default and named taser functions", () => {
    expect(typeof esbuildPlugin).toBe("function");
    expect(typeof esbuildTaser).toBe("function");
    const plugin = esbuildTaser();
    expect(plugin.name).toBe("taserjs:plugin");
  });

  it("nitro adapter exports default and named taser functions", () => {
    expect(typeof nitroPlugin).toBe("function");
    expect(typeof nitroTaser).toBe("function");
    const plugin = nitroTaser();
    const name = Array.isArray(plugin) ? plugin[0]?.name : plugin.name;
    expect(name).toBe("taserjs:plugin");
  });
});

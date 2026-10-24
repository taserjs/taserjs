import { describe, expect, it } from "vitest";

import { taser as esbuildTaser } from "../src/esbuild.js";
import { taser as nitroTaser } from "../src/nitro.js";
import { taser as rolldownTaser } from "../src/rolldown.js";
import { taser as rollupTaser } from "../src/rollup.js";
import { taser as rspackTaser } from "../src/rspack.js";
import { taser as viteTaser } from "../src/vite.js";
import { taser as webpackTaser } from "../src/webpack.js";

const pluginName = (plugin: any) => (Array.isArray(plugin) ? plugin[0] : plugin).name;

describe("bundler subpath adapters", () => {
  it.each([
    ["vite", viteTaser],
    ["rollup", rollupTaser],
    ["rolldown", rolldownTaser],
    ["esbuild", esbuildTaser],
    ["nitro", nitroTaser],
  ])("%s adapter creates a named plugin", (_bundler, taser) => {
    expect(pluginName(taser())).toBe("taserjs:plugin");
  });

  it.each([
    ["webpack", webpackTaser],
    ["rspack", rspackTaser],
  ])("%s adapter creates an applicable plugin", (_bundler, taser) => {
    expect(typeof taser().apply).toBe("function");
  });

  it("vite plugin carries the Nitro hook, and the nitro module exposes setup", () => {
    expect(typeof viteTaser().nitro.setup).toBe("function");
    expect(typeof nitroTaser().setup).toBe("function");
  });
});

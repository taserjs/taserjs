import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ConfigPatchError,
  patchNextConfig,
  patchViteConfig,
} from "../src/frameworks/config-patch.js";

const fixture = (framework: string, file: string) =>
  readFileSync(join(import.meta.dirname, "fixtures", framework, file), "utf-8");

describe("patchViteConfig", () => {
  it("puts taser() first and nitro() last in a TanStack Router config", () => {
    const patched = patchViteConfig(fixture("tanstack-router", "vite.config.ts"), {
      taserOptions: { standalone: false },
      nitro: true,
    });

    expect(patched).toContain("from '@taserjs/plugin/vite'");
    expect(patched).toMatch(/plugins: \[taser\(\{\s*standalone: false,?\s*\}\), tanstackRouter\(/);
    expect(patched).toMatch(/viteReact\(\), nitro\(\)\]/);
    expect(patched).toContain("resolve: { tsconfigPaths: true }");
  });

  it("edits a config that exports a variable declared with defineConfig", () => {
    const patched = patchViteConfig(fixture("tanstack-start", "vite.config.ts"), { nitro: true });

    expect(patched).toMatch(/plugins: \[taser\(\), tanstackStart\(\), viteReact\(\), nitro\(\)\]/);
    expect(patched).toContain("export default defineConfig(");
  });

  it("keeps the Vue config's aliases and existing plugins", () => {
    const patched = patchViteConfig(fixture("vue", "vite.config.ts"), {
      taserOptions: { standalone: false },
      nitro: true,
    });

    expect(patched).toMatch(
      /taser\(\{\s*standalone: false,?\s*\}\), vue\(\), vueDevTools\(\), nitro\(\)/,
    );
    expect(patched).toContain("'@': fileURLToPath(new URL('./src', import.meta.url))");
  });

  it("omits nitro() for bare projects", () => {
    const patched = patchViteConfig(fixture("tanstack-start", "vite.config.ts"), { nitro: false });

    expect(patched).not.toContain("nitro");
    expect(patched).toContain("taser()");
  });

  it("is idempotent", () => {
    const options = { taserOptions: { standalone: false }, nitro: true };
    const once = patchViteConfig(fixture("vue", "vite.config.ts"), options);

    expect(patchViteConfig(once, options)).toBe(once);
  });

  it("adds a plugins array when the config has none", () => {
    const patched = patchViteConfig("export default { server: { port: 1 } };\n", { nitro: false });

    expect(patched).toContain("plugins: [taser()]");
  });
});

describe("patchNextConfig", () => {
  it("wraps the exported config with createTaser()", () => {
    const patched = patchNextConfig(fixture("nextjs", "next.config.ts"));

    expect(patched).toContain('import { createTaser } from "@taserjs/plugin/next"');
    expect(patched).toContain("export default createTaser()(nextConfig);");
    expect(patched).toContain("const nextConfig: NextConfig");
  });

  it("is idempotent", () => {
    const once = patchNextConfig(fixture("nextjs", "next.config.ts"));

    expect(patchNextConfig(once)).toBe(once);
  });

  it("rejects a config without a default export", () => {
    expect(() => patchNextConfig("export const nextConfig = {};\n")).toThrow(ConfigPatchError);
  });
});

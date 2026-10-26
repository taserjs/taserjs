import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ConfigPatchError,
  patchNextConfig,
  patchNuxtConfig,
  patchReactRouterRoutes,
  patchViteConfig,
} from "../src/frameworks/config-patch.js";

const fixture = (framework: string, file: string) =>
  readFileSync(join(import.meta.dirname, "fixtures", framework, file), "utf-8");

// magicast keeps the quote style of the file it edits, so generated configs may use either.
const IMPORT_TASER_VITE = /import \{ taser \} from ["']@taserjs\/plugin\/vite["']/;

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

  it.each([
    ["react", "import react from '@vitejs/plugin-react'", "react()"],
    ["vue", "import vue from '@vitejs/plugin-vue'", "vue()"],
    ["svelte", "import { svelte } from '@sveltejs/vite-plugin-svelte'", "svelte()"],
    ["solid", "import solid from 'vite-plugin-solid'", "solid()"],
    ["preact", "import preact from '@preact/preset-vite'", "preact()"],
  ])(
    "brackets the %s template's plugin with taser() and nitro()",
    (_template, importLine, plugin) => {
      const source = `${importLine}\nimport { defineConfig } from 'vite'\n\nexport default defineConfig({\n  plugins: [${plugin}],\n})\n`;
      const patched = patchViteConfig(source, { taserOptions: { standalone: false }, nitro: true });

      expect(patched).toMatch(
        new RegExp(
          `taser\\(\\{\\s*standalone: false,?\\s*\\}\\), ${plugin.replace("()", "\\(\\)")}, nitro\\(\\)`,
        ),
      );
      expect(patched).toContain(importLine);
    },
  );

  it("omits nitro() for frameworks that deploy themselves", () => {
    const patched = patchViteConfig(fixture("tanstack-start", "vite.config.ts"), { nitro: false });

    expect(patched).not.toContain("nitro");
    expect(patched).toContain("taser()");
  });

  it("is idempotent", () => {
    const options = { taserOptions: { standalone: false }, nitro: true };
    const once = patchViteConfig(fixture("vite", "vite.config.ts"), options);

    expect(patchViteConfig(once, options)).toBe(once);
  });

  it("adds a plugins array when the config has none", () => {
    const patched = patchViteConfig("export default { server: { port: 1 } };\n", { nitro: false });

    expect(patched).toContain("plugins: [taser()]");
  });
});

describe("patchViteConfig on a SvelteKit config", () => {
  it("adds taser() before sveltekit() and keeps the adapter settings", () => {
    const patched = patchViteConfig(fixture("sveltekit", "vite.config.ts"), { nitro: false });

    expect(patched).toMatch(IMPORT_TASER_VITE);
    expect(patched).toMatch(/plugins: \[\s*taser\(\),\s*sveltekit\(/);
    expect(patched).toContain("adapter: adapter()");
    expect(patched).toMatch(/\n\tplugins: \[taser\(\)/);
    expect(patched).not.toContain("nitro");
  });

  it("is idempotent", () => {
    const once = patchViteConfig(fixture("sveltekit", "vite.config.ts"), { nitro: false });

    expect(patchViteConfig(once, { nitro: false })).toBe(once);
  });
});

describe("patchNuxtConfig", () => {
  it("registers taser() under vite.plugins and keeps existing options", () => {
    const patched = patchNuxtConfig(fixture("nuxt", "nuxt.config.ts"));

    expect(patched).toMatch(IMPORT_TASER_VITE);
    expect(patched).toMatch(/vite: \{\s*plugins: \[taser\(\{\s*cwd: process\.cwd\(\)\s*\}\)\]/);
    expect(patched).toContain("compatibilityDate");
    expect(patched).toContain("devtools");
  });

  it("is idempotent", () => {
    const once = patchNuxtConfig(fixture("nuxt", "nuxt.config.ts"));

    expect(patchNuxtConfig(once)).toBe(once);
  });

  it("keeps plugins the config already has under vite", () => {
    const patched = patchNuxtConfig(
      "export default defineNuxtConfig({ vite: { plugins: [other()] } });\n",
    );

    expect(patched).toMatch(/plugins: \[taser\(\{[^}]*\}\), other\(\)\]/);
  });
});

describe("patchReactRouterRoutes", () => {
  it("adds the api resource route and its import, keeping existing routes", () => {
    const patched = patchReactRouterRoutes(fixture("react-router", "app/routes.ts"));

    expect(patched).toMatch(
      /import \{[^}]*\broute\b[^}]*\} from ["']@react-router\/dev\/routes["']/,
    );
    expect(patched).toMatch(/index\(["']routes\/home\.tsx["']\)/);
    expect(patched).toMatch(/route\(["']api\/\*["'], ["']routes\/api\.ts["']\)/);
    expect(patched).toContain("satisfies RouteConfig");
  });

  it("is idempotent", () => {
    const once = patchReactRouterRoutes(fixture("react-router", "app/routes.ts"));

    expect(patchReactRouterRoutes(once)).toBe(once);
  });

  it("rejects a routes file that does not export an array", () => {
    expect(() => patchReactRouterRoutes("export default makeRoutes();\n")).toThrow(
      ConfigPatchError,
    );
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

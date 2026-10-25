import type { ResolvedScaffold } from "../core/types.js";
import { patchViteConfig } from "./config-patch.js";
import type { ConfigPatch } from "./types.js";

const VITE_CONFIG_FILES = [
  "vite.config.ts",
  "vite.config.mts",
  "vite.config.js",
  "vite.config.mjs",
];

/** Packages every UI project adds on top of what its framework generator installs. */
export const UI_TASER_DEPENDENCIES = ["@taserjs/router", "@taserjs/runtime", "@taserjs/client"];
export const UI_TASER_DEV_DEPENDENCIES = ["@taserjs/cli", "@taserjs/plugin"];

function manualViteStep(taserOptions: Record<string, unknown> | undefined, nitro: boolean): string {
  const args = taserOptions ? JSON.stringify(taserOptions) : "";
  const lines = [
    `import { taser } from "@taserjs/plugin/vite";`,
    ...(nitro ? [`import { nitro } from "nitro/vite";`] : []),
    `plugins: [taser(${args}), /* ...your plugins */${nitro ? " nitro()" : ""}]`,
  ];
  return `Add Taser.js to your Vite config:\n${lines.map((line) => `  ${line}`).join("\n")}`;
}

/** Adds `taser()` first and `nitro()` last (unless the framework deploys itself) to the generated Vite config. */
export function viteConfigPatch(
  scaffold: ResolvedScaffold,
  taserOptions?: Record<string, unknown>,
): ConfigPatch {
  const nitro = scaffold.preset !== undefined;
  return {
    candidates: VITE_CONFIG_FILES,
    patch: (source) => patchViteConfig(source, { taserOptions, nitro }),
    manualStep: manualViteStep(taserOptions, nitro),
  };
}

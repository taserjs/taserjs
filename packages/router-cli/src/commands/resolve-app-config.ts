import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEFAULT_IGNORE,
  taserOptionsSchema,
  type TaserUserConfig,
} from "@taserjs/router-generator";

export type ResolvedGenerateConfig = {
  /** Codegen options (entry, extension, quotes, semi, header, format, validate). */
  taser: TaserUserConfig;
  routesDir?: string | undefined;
  basePath?: string | undefined;
  ignore: string[];
  /** Which config surface the options were read from. */
  source: "vite" | "nitro" | "defaults";
};

const VITE_CONFIG_FILES = [
  "vite.config.ts",
  "vite.config.mts",
  "vite.config.js",
  "vite.config.mjs",
];

const NITRO_CONFIG_FILES = [
  "nitro.config.ts",
  "nitro.config.mts",
  "nitro.config.js",
  "nitro.config.mjs",
];

type MaybeTaserPlugin = {
  name?: string;
  __taserOptions?: Record<string, unknown>;
  setup?: unknown;
};

/**
 * Reads Taser configuration across supported setups:
 *
 * 1. Vite Only / Vite + Nitro — `taser(options)` in vite.config
 * 2. Nitro Only               — `modules: [taser(options)]` in nitro.config
 *
 * Falls back to generator defaults when nothing is configured.
 */
export async function resolveAppConfig(rootDir: string): Promise<ResolvedGenerateConfig> {
  // 1. vite.config — find the taser plugin's options.
  for (const file of VITE_CONFIG_FILES) {
    const configPath = resolve(rootDir, file);
    if (!existsSync(configPath)) {
      continue;
    }
    try {
      // oxlint-disable-next-line no-await-in-loop
      const { createJiti } = await import("jiti");
      const jiti = createJiti(process.cwd());
      // oxlint-disable-next-line no-await-in-loop
      const mod = (await jiti.import(configPath)) as {
        default?: { plugins?: unknown; nitro?: unknown };
      };
      const plugins = flatten(
        ((mod.default?.plugins as readonly unknown[] | undefined) ?? []).flat(),
      );
      const taserPlugin = plugins.find(
        (plugin) => (plugin as MaybeTaserPlugin)?.name === "taser",
      ) as MaybeTaserPlugin | undefined;

      if (taserPlugin) {
        return finalize(taserPlugin.__taserOptions || {}, "vite", rootDir);
      }
    } catch {
      // Unreadable config — fall through.
    }
  }

  // 2. nitro.config.ts — check for taser module in modules list.
  for (const file of NITRO_CONFIG_FILES) {
    const configPath = resolve(rootDir, file);
    if (!existsSync(configPath)) {
      continue;
    }
    try {
      // oxlint-disable-next-line no-await-in-loop
      const { createJiti } = await import("jiti");
      const jiti = createJiti(process.cwd());
      // oxlint-disable-next-line no-await-in-loop
      const mod = (await jiti.import(configPath)) as {
        default?: { modules?: unknown[]; ignore?: string[] };
      };
      const modules = flatten(
        ((mod.default?.modules as readonly unknown[] | undefined) ?? []).flat(),
      );
      const taserMod = modules.find((m) => (m as MaybeTaserPlugin)?.name === "taser") as
        | MaybeTaserPlugin
        | undefined;

      if (taserMod) {
        return finalize(
          taserMod.__taserOptions || {},
          "nitro",
          rootDir,
          mod.default as Record<string, unknown>,
        );
      }
    } catch {
      // Fall through.
    }
  }

  // 3. Defaults.
  return finalize({}, "defaults", rootDir);
}

function finalize(
  raw: Record<string, unknown>,
  source: ResolvedGenerateConfig["source"],
  rootDir: string,
  nitroOptions?: Record<string, unknown>,
): ResolvedGenerateConfig {
  const taser = taserOptionsSchema.parse(raw);
  const ignore = Array.from(
    new Set([
      ...(((nitroOptions?.ignore as string[]) ?? (raw.ignore as string[]) ?? []) as string[]),
      ...DEFAULT_IGNORE,
    ]),
  );
  void rootDir;
  return {
    taser,
    routesDir: (raw.routesDir as string | undefined) ?? taser.routesDir,
    basePath: raw.basePath as string | undefined,
    ignore,
    source,
  };
}

function flatten(plugins: readonly unknown[]): unknown[] {
  const flat: unknown[] = [];
  for (const plugin of plugins) {
    if (Array.isArray(plugin)) {
      flat.push(...flatten(plugin));
    } else if (plugin) {
      flat.push(plugin);
    }
  }
  return flat;
}

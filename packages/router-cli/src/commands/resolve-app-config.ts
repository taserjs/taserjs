import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEFAULT_IGNORE,
  flattenPlugins,
  taserConfigSchema,
  type ResolvedTaserConfig,
} from "@taserjs/router-generator";

export type ResolvedGenerateConfig = {
  taser: ResolvedTaserConfig;
  routesDir?: string | undefined;
  basePath?: string | undefined;
  ignore: string[];
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

export async function resolveAppConfig(rootDir: string): Promise<ResolvedGenerateConfig> {
  const { createJiti } = await import("jiti");
  const jiti = createJiti(process.cwd());

  for (const file of VITE_CONFIG_FILES) {
    const configPath = resolve(rootDir, file);
    if (!existsSync(configPath)) {
      continue;
    }
    try {
      // oxlint-disable-next-line no-await-in-loop
      const mod = (await jiti.import(configPath)) as {
        default?: { plugins?: unknown; nitro?: unknown };
      };
      const plugins = flattenPlugins(
        ((mod.default?.plugins as readonly unknown[] | undefined) ?? []).flat(),
      );
      const taserPlugin = plugins.find(
        (plugin) => (plugin as MaybeTaserPlugin)?.name === "taser",
      ) as MaybeTaserPlugin | undefined;

      if (taserPlugin) {
        return finalize(taserPlugin.__taserOptions || {}, "vite");
      }
    } catch {
      // Unreadable config — fall through.
    }
  }

  for (const file of NITRO_CONFIG_FILES) {
    const configPath = resolve(rootDir, file);
    if (!existsSync(configPath)) {
      continue;
    }
    try {
      // oxlint-disable-next-line no-await-in-loop
      const mod = (await jiti.import(configPath)) as {
        default?: { modules?: unknown[]; ignore?: string[] };
      };
      const modules = flattenPlugins(
        ((mod.default?.modules as readonly unknown[] | undefined) ?? []).flat(),
      );
      const taserMod = modules.find((m) => (m as MaybeTaserPlugin)?.name === "taser") as
        | MaybeTaserPlugin
        | undefined;

      if (taserMod) {
        return finalize(
          taserMod.__taserOptions || {},
          "nitro",
          mod.default as Record<string, unknown>,
        );
      }
    } catch {
      // Fall through.
    }
  }

  return finalize({}, "defaults");
}

function finalize(
  raw: Record<string, unknown>,
  source: ResolvedGenerateConfig["source"],
  nitroOptions?: Record<string, unknown>,
): ResolvedGenerateConfig {
  const taser = taserConfigSchema.parse(raw);
  const ignore = Array.from(
    new Set([
      ...(((nitroOptions?.ignore as string[]) ??
        (raw.ignore as string[]) ??
        taser.ignore ??
        []) as string[]),
      ...DEFAULT_IGNORE,
    ]),
  );
  return {
    taser,
    routesDir: (raw.routesDir as string | undefined) ?? taser.routesDir,
    basePath: (raw.basePath as string | undefined) ?? taser.basePath,
    ignore,
    source,
  };
}

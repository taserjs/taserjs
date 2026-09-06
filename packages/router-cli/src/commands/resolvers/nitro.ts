import { flattenPlugins } from "@taserjs/router-generator";
import type { ConfigResolver, ConfigProviderResult, MaybeTaserPlugin } from "./types.js";
import { findExistingConfigFiles } from "./utils.js";

const NITRO_CONFIG_FILES = [
  "nitro.config.ts",
  "nitro.config.mts",
  "nitro.config.js",
  "nitro.config.mjs",
] as const;

export const resolveNitroConfig: ConfigResolver = async (
  rootDir,
  jiti,
  explicitConfigFile,
): Promise<ConfigProviderResult | null> => {
  const existingFiles = explicitConfigFile
    ? await findExistingConfigFiles(rootDir, [explicitConfigFile])
    : await findExistingConfigFiles(rootDir, NITRO_CONFIG_FILES);

  if (existingFiles.length === 0) {
    return null;
  }

  const results = await Promise.all(
    existingFiles.map(async (configPath) => {
      try {
        const mod = (await jiti.import(configPath)) as { default?: unknown };
        let rawConfig = mod?.default ?? mod;
        if (typeof rawConfig === "function") {
          rawConfig = await (rawConfig as Function)();
        }
        const configObj = rawConfig as { modules?: unknown[]; ignore?: string[] } | undefined;
        const modules = flattenPlugins(
          (configObj?.modules as readonly unknown[] | undefined) ?? [],
        );
        const taserMod = modules.find((m) => (m as MaybeTaserPlugin)?.name === "taser") as
          | MaybeTaserPlugin
          | undefined;

        if (taserMod) {
          return {
            options: taserMod.__taserOptions || {},
            source: "nitro" as const,
            frameworkOptions: configObj as Record<string, unknown>,
          };
        }
      } catch {
        // Continue to next existing file if any
      }
      return null;
    }),
  );

  const match = results.find((res) => res !== null);
  return match ?? null;
};

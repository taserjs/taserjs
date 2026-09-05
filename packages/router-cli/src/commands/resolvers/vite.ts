import { flattenPlugins } from "@taserjs/router-generator";
import type { ConfigResolver, ConfigProviderResult, MaybeTaserPlugin } from "./types.js";
import { findExistingConfigFiles } from "./utils.js";

const VITE_CONFIG_FILES = [
  "vite.config.ts",
  "vite.config.mts",
  "vite.config.js",
  "vite.config.mjs",
] as const;

export const resolveViteConfig: ConfigResolver = async (
  rootDir,
  jiti,
  explicitConfigFile,
): Promise<ConfigProviderResult | null> => {
  const existingFiles = explicitConfigFile
    ? await findExistingConfigFiles(rootDir, [explicitConfigFile])
    : await findExistingConfigFiles(rootDir, VITE_CONFIG_FILES);

  if (existingFiles.length === 0) {
    return null;
  }

  const results = await Promise.all(
    existingFiles.map(async (configPath) => {
      try {
        const mod = (await jiti.import(configPath)) as { default?: unknown };
        let rawConfig = mod?.default ?? mod;
        if (typeof rawConfig === "function") {
          rawConfig = await (rawConfig as Function)({ command: "build", mode: "production" });
        }
        const configObj = rawConfig as { plugins?: unknown } | undefined;
        const plugins = flattenPlugins(
          (configObj?.plugins as readonly unknown[] | undefined) ?? [],
        );
        const taserPlugin = plugins.find(
          (plugin) => (plugin as MaybeTaserPlugin)?.name === "taser",
        ) as MaybeTaserPlugin | undefined;

        if (taserPlugin) {
          return {
            options: taserPlugin.__taserOptions || {},
            source: "vite" as const,
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

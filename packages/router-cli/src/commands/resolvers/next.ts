import type { ConfigResolver, ConfigProviderResult } from "./types.js";
import { findExistingConfigFiles } from "./utils.js";

const NEXT_CONFIG_FILES = [
  "next.config.ts",
  "next.config.mts",
  "next.config.mjs",
  "next.config.js",
  "next.config.cjs",
] as const;

type MaybeNextConfig = {
  __taserRouterPlugin?: boolean;
  __taserOptions?: Record<string, unknown>;
  __taserCloseWatcher?: () => Promise<void> | void;
  webpack?: { __taserOptions?: Record<string, unknown> } | ((...args: unknown[]) => unknown);
  [key: string]: unknown;
};

export const resolveNextConfig: ConfigResolver = async (
  rootDir,
  jiti,
  explicitConfigFile,
): Promise<ConfigProviderResult | null> => {
  const existingFiles = explicitConfigFile
    ? await findExistingConfigFiles(rootDir, [explicitConfigFile])
    : await findExistingConfigFiles(rootDir, NEXT_CONFIG_FILES);

  if (existingFiles.length === 0) {
    return null;
  }

  const prevConfigOnly = process.env.TASER_CONFIG_ONLY;
  const prevRootDir = process.env.TASER_ROOT_DIR;
  process.env.TASER_CONFIG_ONLY = "true";
  process.env.TASER_ROOT_DIR = rootDir;

  try {
    const results = await Promise.all(
      existingFiles.map(async (configPath) => {
        try {
          const mod = (await jiti.import(configPath)) as { default?: unknown };
          let rawConfig = mod?.default ?? mod;

          let taserOptions = (rawConfig as MaybeNextConfig)?.__taserOptions;
          let isTaserPlugin = Boolean((rawConfig as MaybeNextConfig)?.__taserRouterPlugin);

          let resolvedConfig: MaybeNextConfig | undefined;
          if (typeof rawConfig === "function") {
            try {
              const invoked = await (rawConfig as Function)("phase-production-build", {
                defaultConfig: {},
              });
              if (invoked && typeof invoked === "object") {
                resolvedConfig = invoked as MaybeNextConfig;
                taserOptions = resolvedConfig.__taserOptions ?? taserOptions;
                isTaserPlugin = Boolean(resolvedConfig.__taserRouterPlugin) || isTaserPlugin;
              }
            } catch {
              // Function evaluation fallback
            }
          } else if (rawConfig && typeof rawConfig === "object") {
            resolvedConfig = rawConfig as MaybeNextConfig;
            taserOptions = resolvedConfig.__taserOptions ?? taserOptions;
            isTaserPlugin = Boolean(resolvedConfig.__taserRouterPlugin) || isTaserPlugin;
          }

          if (!taserOptions && resolvedConfig?.webpack) {
            const webpackOptions = (
              resolvedConfig.webpack as { __taserOptions?: Record<string, unknown> }
            )?.__taserOptions;
            if (webpackOptions) {
              taserOptions = webpackOptions;
              isTaserPlugin = true;
            }
          }

          if (resolvedConfig?.__taserCloseWatcher) {
            try {
              await resolvedConfig.__taserCloseWatcher();
            } catch {
              // Ignore
            }
          }

          if (isTaserPlugin || taserOptions) {
            return {
              options: taserOptions || {},
              source: "next" as const,
              frameworkOptions: resolvedConfig as Record<string, unknown>,
            };
          }
        } catch {
          // Continue to next file
        }
        return null;
      }),
    );

    const match = results.find((res) => res !== null);
    if (match) {
      return match;
    }
  } finally {
    if (prevConfigOnly === undefined) {
      delete process.env.TASER_CONFIG_ONLY;
    } else {
      process.env.TASER_CONFIG_ONLY = prevConfigOnly;
    }
    if (prevRootDir === undefined) {
      delete process.env.TASER_ROOT_DIR;
    } else {
      process.env.TASER_ROOT_DIR = prevRootDir;
    }
  }

  return null;
};

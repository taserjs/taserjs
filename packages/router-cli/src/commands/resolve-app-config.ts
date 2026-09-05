import { basename, isAbsolute, dirname, resolve } from "node:path";
import {
  DEFAULT_IGNORE,
  taserConfigSchema,
  type ResolvedTaserConfig,
} from "@taserjs/router-generator";
import { resolveViteConfig } from "./resolvers/vite.js";
import { resolveNitroConfig } from "./resolvers/nitro.js";
import { resolveNextConfig } from "./resolvers/next.js";
import type { ConfigResolver } from "./resolvers/types.js";

export type ResolvedGenerateConfig = {
  taser: ResolvedTaserConfig;
  routesDir?: string | undefined;
  basePath?: string | undefined;
  ignore: string[];
  source: "vite" | "nitro" | "next";
  rootDir: string;
};

const PROVIDER_RESOLVERS: readonly ConfigResolver[] = [
  resolveViteConfig,
  resolveNitroConfig,
  resolveNextConfig,
];

function detectProviderFromFilename(fileName: string): ConfigResolver | null {
  const base = basename(fileName).toLowerCase();
  if (base.startsWith("vite.config")) {
    return resolveViteConfig;
  }
  if (base.startsWith("nitro.config")) {
    return resolveNitroConfig;
  }
  if (base.startsWith("next.config")) {
    return resolveNextConfig;
  }
  return null;
}

export async function resolveAppConfig(configFile?: string): Promise<ResolvedGenerateConfig> {
  const { createJiti } = await import("jiti");

  if (configFile) {
    const absConfigPath = isAbsolute(configFile) ? configFile : resolve(process.cwd(), configFile);
    const rootDir = dirname(absConfigPath);
    const jiti = createJiti(rootDir);

    const singleResolver = detectProviderFromFilename(absConfigPath);
    if (singleResolver) {
      const result = await singleResolver(rootDir, jiti, absConfigPath);
      if (result) {
        return finalize(result.options, result.source, rootDir, result.frameworkOptions);
      }
      throw new Error(`[taserjs] Could not detect valid Taser configuration in "${configFile}".`);
    }

    const settledResults = await Promise.allSettled(
      PROVIDER_RESOLVERS.map((resolver) => resolver(rootDir, jiti, absConfigPath)),
    );

    for (const settled of settledResults) {
      if (settled.status === "fulfilled" && settled.value) {
        return finalize(
          settled.value.options,
          settled.value.source,
          rootDir,
          settled.value.frameworkOptions,
        );
      }
    }

    throw new Error(`[taserjs] Could not detect valid Taser configuration in "${configFile}".`);
  }

  const rootDir = process.cwd();
  const jiti = createJiti(rootDir);

  const settledResults = await Promise.allSettled(
    PROVIDER_RESOLVERS.map((resolver) => resolver(rootDir, jiti)),
  );

  for (const settled of settledResults) {
    if (settled.status === "fulfilled" && settled.value) {
      return finalize(
        settled.value.options,
        settled.value.source,
        rootDir,
        settled.value.frameworkOptions,
      );
    }
  }

  throw new Error(
    `[taserjs] No Taser configuration found in "${rootDir}". Please provide a configuration file (vite.config, nitro.config, or next.config) or use --config.`,
  );
}

function finalize(
  raw: Record<string, unknown>,
  source: ResolvedGenerateConfig["source"],
  rootDir: string,
  frameworkOptions?: Record<string, unknown>,
): ResolvedGenerateConfig {
  const taser = taserConfigSchema.parse({
    ...raw,
    ...(frameworkOptions?.ignore ? { ignore: frameworkOptions.ignore } : {}),
  });
  const ignore = Array.from(
    new Set([
      ...(((frameworkOptions?.ignore as string[]) ??
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
    rootDir,
  };
}

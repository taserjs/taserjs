import type { Jiti } from "jiti";

export type ConfigProviderResult = {
  options: Record<string, unknown>;
  source: "vite" | "nitro" | "next";
  frameworkOptions?: Record<string, unknown>;
};

export type ConfigResolver = (
  rootDir: string,
  jiti: Jiti,
  explicitConfigFile?: string,
) => Promise<ConfigProviderResult | null>;

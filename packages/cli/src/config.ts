import { existsSync } from "node:fs";

import { createJiti } from "jiti";
import { resolve } from "pathe";

import type { ResolvedTaserConfig, TaserConfig } from "./config-shared.js";
import { resolveConfig } from "./config-shared.js";

export {
  defineConfig,
  resolveConfig,
  resolvePaths,
  type ResolvedTaserConfig,
  type TaserConfig,
  type TaserConfigExport,
  type TaserPaths,
} from "./config-shared.js";

const CONFIG_FILE_NAMES = [
  "taserjs.config.ts",
  "taserjs.config.js",
  "taserjs.config.mjs",
  "taserjs.config.cjs",
];

export async function loadConfig(
  cwd: string = process.cwd(),
  customConfigPath?: string,
): Promise<ResolvedTaserConfig> {
  const configFile = customConfigPath
    ? resolve(cwd, customConfigPath)
    : CONFIG_FILE_NAMES.map((name) => resolve(cwd, name)).find(existsSync);

  if (customConfigPath && !existsSync(configFile!)) {
    throw new Error(`Config file not found: ${customConfigPath}`);
  }
  if (!configFile) return resolveConfig();

  try {
    const jiti = createJiti(cwd, { interopDefault: true });
    let loaded = await jiti.import<unknown>(configFile, { default: true });
    if (typeof loaded === "function") loaded = await loaded();
    return resolveConfig(
      loaded && typeof loaded === "object" ? (loaded as TaserConfig) : {},
      configFile,
    );
  } catch (err) {
    throw new Error(`Failed to load config file ${configFile}: ${(err as Error).message}`, {
      cause: err,
    });
  }
}

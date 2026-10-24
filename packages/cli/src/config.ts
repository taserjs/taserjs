import { existsSync } from "node:fs";

import { createJiti } from "jiti";
import { resolve } from "pathe";

export interface TaserConfig {
  server?: boolean | undefined;
  serverDir?: string | undefined;
  routesDir?: string | undefined;
  outputDir?: string | undefined;
  app?: string | undefined;
  /** Import suffix in generated code: `true` -> `.js`, `false` -> none, string -> custom. */
  extension?: boolean | string | undefined;
}

export type TaserConfigExport = TaserConfig | (() => TaserConfig | Promise<TaserConfig>);

export interface ResolvedTaserConfig {
  server?: boolean | undefined;
  serverDir: string;
  routesDir: string;
  outputDir: string;
  app: string;
  importExt: string;
  configFile?: string | undefined;
}

export interface TaserPaths {
  serverDir: string;
  routesDir: string;
  outputDir: string;
  appFile: string;
  manifestFile: string;
}

const CONFIG_FILE_NAMES = [
  "taserjs.config.ts",
  "taserjs.config.js",
  "taserjs.config.mjs",
  "taserjs.config.cjs",
];

export function defineConfig<T extends TaserConfigExport>(config: T): T {
  return config;
}

function toImportExt(extension: boolean | string = true): string {
  if (typeof extension === "boolean") return extension ? ".js" : "";
  const bare = extension.trim().replace(/^\.+/, "");
  return bare && `.${bare}`;
}

export function resolveConfig(raw: TaserConfig = {}, configFile?: string): ResolvedTaserConfig {
  return {
    server: raw.server,
    serverDir: raw.serverDir ?? "src",
    routesDir: raw.routesDir ?? "routes",
    outputDir: raw.outputDir ?? ".taserjs",
    app: raw.app ?? "taser.ts",
    importExt: toImportExt(raw.extension),
    configFile,
  };
}

/** `routesDir`, `outputDir` and `app` are relative to `serverDir` (absolute paths are kept). */
export function resolvePaths(config: ResolvedTaserConfig, cwd: string = process.cwd()): TaserPaths {
  const inServerDir = (sub: string) => resolve(cwd, config.serverDir, sub);
  const outputDir = inServerDir(config.outputDir);
  return {
    serverDir: resolve(cwd, config.serverDir),
    routesDir: inServerDir(config.routesDir),
    outputDir,
    appFile: inServerDir(config.app),
    manifestFile: resolve(outputDir, "routes.gen.ts"),
  };
}

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

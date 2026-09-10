import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createJiti } from "jiti";

export interface TaserFormattingConfig {
  quotes?: "single" | "double" | undefined;
  semi?: boolean | undefined;
}

export interface TaserConfig {
  serverDir?: string | undefined;
  routesDir?: string | undefined;
  outputDir?: string | undefined;
  app?: string | undefined;
  extension?: boolean | string | undefined;
  formatting?: TaserFormattingConfig | undefined;
}

export type TaserConfigFn = () => TaserConfig | Promise<TaserConfig>;
export type TaserConfigExport = TaserConfig | TaserConfigFn;

export interface ResolvedTaserConfig {
  serverDir: string;
  routesDir: string;
  outputDir: string;
  app: string;
  extension: boolean | string;
  formatting: {
    quotes: "single" | "double";
    semi: boolean;
  };
  configFile?: string | undefined;
}

export const DEFAULT_CONFIG: ResolvedTaserConfig = {
  serverDir: "src",
  routesDir: "routes",
  outputDir: ".taserjs",
  app: "taser.ts",
  extension: true,
  formatting: {
    quotes: "double",
    semi: true,
  },
};

export function resolveImportExtension(extension: boolean | string | undefined = true): string {
  if (extension === true) {
    return ".js";
  }
  if (extension === false) {
    return "";
  }
  const trimmed = extension.trim().replace(/^\.+/, "");
  return trimmed ? `.${trimmed}` : "";
}

export function defineConfig(config: TaserConfig = {}): TaserConfig {
  return {
    ...config,
    routesDir: config.routesDir ?? DEFAULT_CONFIG.routesDir,
    outputDir: config.outputDir ?? DEFAULT_CONFIG.outputDir,
    extension: config.extension ?? DEFAULT_CONFIG.extension,
    formatting: {
      quotes: config.formatting?.quotes ?? DEFAULT_CONFIG.formatting.quotes,
      ...(config.formatting?.semi !== undefined ? { semi: config.formatting.semi } : {}),
    },
  };
}

const ABSOLUTE_PATH_REGEX = /^[a-zA-Z]:[/\\]/;
const LEADING_DOT_SLASH_REGEX = /^\.[/\\]/;

function resolveServerSubPath(serverDir: string, subPath: string, cwd: string): string {
  if (subPath.startsWith("/") || ABSOLUTE_PATH_REGEX.test(subPath)) {
    return resolve(subPath);
  }
  const cleanServerDir = serverDir.replace(LEADING_DOT_SLASH_REGEX, "");
  const cleanSubPath = subPath.replace(LEADING_DOT_SLASH_REGEX, "");
  if (
    cleanServerDir &&
    (cleanSubPath === cleanServerDir ||
      cleanSubPath.startsWith(`${cleanServerDir}/`) ||
      cleanSubPath.startsWith(`${cleanServerDir}\\`))
  ) {
    return resolve(cwd, cleanSubPath);
  }
  return resolve(cwd, serverDir, subPath);
}

export function resolveServerDir(config: ResolvedTaserConfig, cwd: string = process.cwd()): string {
  return resolve(cwd, config.serverDir);
}

export function resolveRoutesDir(config: ResolvedTaserConfig, cwd: string = process.cwd()): string {
  return resolveServerSubPath(config.serverDir, config.routesDir, cwd);
}

export function resolveOutputDir(config: ResolvedTaserConfig, cwd: string = process.cwd()): string {
  return resolveServerSubPath(config.serverDir, config.outputDir, cwd);
}

export function resolveAppFile(config: ResolvedTaserConfig, cwd: string = process.cwd()): string {
  return resolveServerSubPath(config.serverDir, config.app, cwd);
}

export async function loadConfig(
  cwd: string = process.cwd(),
  customConfigPath?: string,
): Promise<ResolvedTaserConfig> {
  let configFilePath: string | undefined;

  if (customConfigPath) {
    const candidate = resolve(cwd, customConfigPath);
    if (existsSync(candidate)) {
      configFilePath = candidate;
    } else {
      throw new Error(`Config file not found: ${customConfigPath}`);
    }
  } else {
    const candidateNames = [
      "taserjs.config.ts",
      "taserjs.config.js",
      "taserjs.config.mjs",
      "taserjs.config.cjs",
    ];

    for (const name of candidateNames) {
      const candidate = resolve(cwd, name);
      if (existsSync(candidate)) {
        configFilePath = candidate;
        break;
      }
    }
  }

  if (!configFilePath) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const jiti = createJiti(cwd, { interopDefault: true });
    const loaded = (await jiti.import(configFilePath, { default: true })) as
      | TaserConfigExport
      | { default?: TaserConfigExport };

    const hasDefault =
      loaded !== null &&
      typeof loaded === "object" &&
      "default" in loaded &&
      (loaded as { default?: unknown }).default !== undefined;

    let candidateConfig: unknown = hasDefault ? (loaded as { default: unknown }).default : loaded;

    if (typeof candidateConfig === "function") {
      candidateConfig = await (candidateConfig as () => Promise<unknown> | unknown)();
    }

    const rawConfig: TaserConfig =
      candidateConfig !== null && typeof candidateConfig === "object"
        ? (candidateConfig as TaserConfig)
        : {};

    return {
      serverDir: rawConfig.serverDir ?? DEFAULT_CONFIG.serverDir,
      routesDir: rawConfig.routesDir ?? DEFAULT_CONFIG.routesDir,
      outputDir: rawConfig.outputDir ?? DEFAULT_CONFIG.outputDir,
      app: rawConfig.app ?? DEFAULT_CONFIG.app,
      extension: rawConfig.extension ?? DEFAULT_CONFIG.extension,
      formatting: {
        quotes: rawConfig.formatting?.quotes ?? DEFAULT_CONFIG.formatting.quotes,
        semi: rawConfig.formatting?.semi ?? DEFAULT_CONFIG.formatting.semi,
      },
      configFile: configFilePath,
    };
  } catch (err) {
    throw new Error(`Failed to load config file ${configFilePath}: ${(err as Error).message}`, {
      cause: err,
    });
  }
}

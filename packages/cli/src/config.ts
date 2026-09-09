import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createJiti } from "jiti";

export interface TaserFormattingConfig {
  quotes?: "single" | "double" | undefined;
}

export interface TaserConfig {
  routesDir?: string | undefined;
  outputDir?: string | undefined;
  contextFile?: string | undefined;
  extensions?: string[] | undefined;
  formatting?: TaserFormattingConfig | undefined;
}

export interface ResolvedTaserConfig {
  routesDir: string;
  outputDir: string;
  contextFile?: string | undefined;
  extensions: string[];
  formatting: {
    quotes: "single" | "double";
  };
  configFile?: string | undefined;
}

export function defineConfig(config: TaserConfig): TaserConfig {
  return config;
}

export const DEFAULT_CONFIG: ResolvedTaserConfig = {
  routesDir: "./src/routes",
  outputDir: "./.taserjs",
  contextFile: undefined,
  extensions: ["ts", "tsx"],
  formatting: {
    quotes: "double",
  },
};

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
      | TaserConfig
      | { default?: TaserConfig };

    const rawConfig: TaserConfig =
      loaded && typeof loaded === "object" && "default" in loaded && loaded.default
        ? (loaded.default as TaserConfig)
        : (loaded as TaserConfig) || {};

    return {
      routesDir: rawConfig.routesDir ?? DEFAULT_CONFIG.routesDir,
      outputDir: rawConfig.outputDir ?? DEFAULT_CONFIG.outputDir,
      contextFile: rawConfig.contextFile ?? DEFAULT_CONFIG.contextFile,
      extensions: rawConfig.extensions ? [...rawConfig.extensions] : DEFAULT_CONFIG.extensions,
      formatting: {
        quotes: rawConfig.formatting?.quotes ?? DEFAULT_CONFIG.formatting.quotes,
      },
      configFile: configFilePath,
    };
  } catch (err) {
    throw new Error(`Failed to load config file ${configFilePath}: ${(err as Error).message}`, {
      cause: err,
    });
  }
}

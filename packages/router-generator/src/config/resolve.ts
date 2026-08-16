import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

import {
  CONFIG_FILE_NAME,
  type GeneratorConfigFile,
  type GeneratorRunOptions,
  type ResolvedGeneratorConfig,
  generatorConfigSchema,
} from "./schema.js";

function readConfigFile(configFile: string): GeneratorConfigFile | null {
  if (!existsSync(configFile)) {
    return null;
  }

  const raw = JSON.parse(readFileSync(configFile, "utf8")) as unknown;
  return generatorConfigSchema.parse(raw);
}

function resolvePath(baseDirectory: string, targetPath: string): string {
  return isAbsolute(targetPath) ? targetPath : resolve(baseDirectory, targetPath);
}

export function findConfigFile(startDirectory: string): string {
  const start = resolve(startDirectory);
  let current = start;
  let packageDirectory: string | undefined;

  while (true) {
    const candidate = join(current, CONFIG_FILE_NAME);
    if (existsSync(candidate)) {
      return candidate;
    }
    if (packageDirectory === undefined && existsSync(join(current, "package.json"))) {
      packageDirectory = current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return join(packageDirectory ?? start, CONFIG_FILE_NAME);
    }
    current = parent;
  }
}

export function resolveGeneratorConfig(options: GeneratorRunOptions = {}): ResolvedGeneratorConfig {
  const configFile = options.configFile
    ? resolve(options.configFile)
    : findConfigFile(process.cwd());
  const configDir = dirname(configFile);
  const fileConfig = readConfigFile(configFile);

  const merged = generatorConfigSchema.parse({
    ...fileConfig,
    routes: options.routes ?? fileConfig?.routes,
    output: options.output ?? fileConfig?.output,
    entry: options.entry ?? fileConfig?.entry,
    extension: options.extension ?? fileConfig?.extension,
    ignorePrefix: options.ignorePrefix ?? fileConfig?.ignorePrefix,
    ignorePattern: options.ignorePattern ?? fileConfig?.ignorePattern,
    quiet: options.quiet ?? fileConfig?.quiet,
    quotes: options.quotes ?? fileConfig?.quotes,
    semi: options.semi ?? fileConfig?.semi,
    header: options.header ?? fileConfig?.header,
    footer: options.footer ?? fileConfig?.footer,
    format: options.format ?? fileConfig?.format,
    validate: options.validate ?? fileConfig?.validate,
  });

  const routesDir = isAbsolute(merged.routes)
    ? merged.routes
    : resolvePath(configDir, merged.routes);
  const outputFile = isAbsolute(merged.output)
    ? merged.output
    : resolvePath(configDir, merged.output);

  return {
    ...merged,
    configFile,
    configDir,
    routesDir,
    outputFile,
  };
}

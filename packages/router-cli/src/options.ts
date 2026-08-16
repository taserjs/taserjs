import { resolve } from "node:path";

import { compileRouteFileIgnorePattern } from "@taserjs/router-generator";
import type { ExtensionOption, GeneratorRunOptions } from "@taserjs/router-generator";

function parseExtension(value: string): ExtensionOption {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return value;
}

export function buildOptions(argv: Record<string, unknown>): GeneratorRunOptions {
  const ignorePattern = argv.ignorePattern as string | undefined;
  if (ignorePattern) {
    compileRouteFileIgnorePattern(ignorePattern);
  }

  return {
    ...(argv.config ? { configFile: resolve(argv.config as string) } : {}),
    ...(argv.routes ? { routes: resolve(argv.routes as string) } : {}),
    ...(argv.output ? { output: resolve(argv.output as string) } : {}),
    ...(argv.entry ? { entry: argv.entry as string } : {}),
    ...(argv.ignorePrefix ? { ignorePrefix: argv.ignorePrefix as string } : {}),
    ...(argv.ignorePattern ? { ignorePattern: argv.ignorePattern as string } : {}),
    ...(argv.extension !== undefined
      ? { extension: parseExtension(argv.extension as string) }
      : {}),
    ...(argv.quotes ? { quotes: argv.quotes as "single" | "double" } : {}),
    ...(argv.semi !== undefined ? { semi: argv.semi as boolean } : {}),
    ...(argv.format !== undefined ? { format: argv.format as boolean } : {}),
    ...(argv.validate !== undefined ? { validate: argv.validate as boolean } : {}),
    ...(argv.quiet !== undefined ? { quiet: argv.quiet as boolean } : {}),
    ...(argv.force ? { force: true } : {}),
  };
}

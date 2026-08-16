import { resolve } from "node:path";

import { findConfigFile } from "@taserjs/router-generator";

export function resolveConfigFile(argv: Record<string, unknown>): string {
  return argv.config ? resolve(argv.config as string) : findConfigFile(process.cwd());
}

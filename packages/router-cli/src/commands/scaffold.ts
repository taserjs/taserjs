import { resolveGeneratorConfig, scaffoldRouteFileAtPath } from "@taserjs/router-generator";

import { buildOptions } from "../options.js";
import { resolveConfigFile } from "../support/resolve-config-file.js";

export async function runScaffold(argv: Record<string, unknown>): Promise<void> {
  const options = buildOptions(argv);
  options.configFile = resolveConfigFile(argv);
  const resolved = resolveGeneratorConfig(options);

  const targetPath = argv.path as string | undefined;
  if (!targetPath) {
    throw new Error("scaffold requires a target file path");
  }

  const result = await scaffoldRouteFileAtPath(resolved.routesDir, targetPath, {
    entry: resolved.entry,
    ignorePrefix: resolved.ignorePrefix,
    ignorePattern: resolved.ignorePattern,
  });
  if (result === "written") {
    console.log(`Scaffolded ${targetPath}`);
    return;
  }

  console.log(`Skipped scaffold for ${targetPath} (${result})`);
}

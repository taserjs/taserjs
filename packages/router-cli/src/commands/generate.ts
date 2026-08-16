import { generateRouteTree } from "@taserjs/router-generator";

import { buildOptions } from "../options.js";
import { resolveConfigFile } from "../support/resolve-config-file.js";

export async function runGenerate(argv: Record<string, unknown>): Promise<void> {
  const options = buildOptions(argv);
  options.configFile = resolveConfigFile(argv);
  await generateRouteTree(options);
}

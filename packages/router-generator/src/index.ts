export { CONFIG_FILE_NAME } from "./constants.js";
export { generateRouteTree, watchRouteTree, Generator } from "./generator/generator.js";
export type {
  GeneratorEvent,
  GeneratorEventType,
  GeneratorRunResult,
  WatchRouteTreeHandle,
} from "./generator/generator.js";
export { findConfigFile, resolveGeneratorConfig } from "./config/resolve.js";
export { formatDefaultConfigFile, defaultConfigValues } from "./config/default-config.js";
export {
  compileRouteFileIgnorePattern,
  shouldIgnoreRouteFile,
  shouldIgnoreRoutePath,
} from "./scan/filter.js";
export type { RouteIgnoreConfig } from "./scan/filter.js";
export { scaffoldRouteFileAtPath } from "./scaffold/scaffold-file.js";
export type { ScaffoldResult } from "./scaffold/scaffold-file.js";
export { generatorConfigSchema } from "./config/schema.js";
export { ALL_CLI_OPTIONS, CONFIG_CLI_OPTIONS, CLI_ONLY_OPTIONS } from "./config/cli-options.js";
export type { ExtensionOption } from "./config/schema.js";
export type {
  GeneratorConfigFile,
  GeneratorRunOptions,
  ResolvedGeneratorConfig,
} from "./types/index.js";

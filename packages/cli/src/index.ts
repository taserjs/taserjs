export {
  defineConfig,
  loadConfig,
  DEFAULT_CONFIG,
  resolveServerDir,
  resolveRoutesDir,
  resolveOutputDir,
  resolveAppFile,
  resolveImportExtension,
  type TaserConfig,
  type TaserConfigFn,
  type TaserConfigExport,
  type ResolvedTaserConfig,
  type TaserFormattingConfig,
} from "./config.js";

export { normalizeImportPath, formatRelativeImport } from "./paths.js";

export {
  executeGenerate,
  type ExecuteGenerateOptions,
  type ExecuteGenerateResult,
} from "./generator.js";

export const VERSION = "0.0.1";

export {
  defineConfig,
  loadConfig,
  DEFAULT_CONFIG,
  type TaserConfig,
  type ResolvedTaserConfig,
  type TaserFormattingConfig,
} from "./config.js";

export {
  splitUnescapedDots,
  unescapeBrackets,
  isPathlessSegment,
  normalizeSegmentToUrl,
  isIgnoredPath,
  parseFilePath,
  deriveCanonicalUrl,
  deriveLayoutInfo,
  HTTP_METHODS,
  type HttpMethodLower,
  type ParsedRouteFileInfo,
  type ParsedLayoutFileInfo,
  type ParsedFileInfo,
} from "./paths.js";

export {
  scanRoutes,
  validateAst,
  type ScanDiagnostic,
  type DiscoveredRoute,
  type DiscoveredLayout,
  type ScanResult,
  type ScanOptions,
} from "./scanner.js";

export {
  generateManifest,
  generateManifestCode,
  resolveLayoutsForRoute,
  type GenerateResult,
} from "./generator.js";

export { runGenerate, run, createCli } from "./cli.js";

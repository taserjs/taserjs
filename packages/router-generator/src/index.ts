export {
  DEFAULT_SERVER_DIR,
  DEFAULT_ROUTES_DIR,
  DEFAULT_ENTRY,
  DEFAULT_SERVER_ENTRY,
  DEFAULT_IGNORE,
  DEFAULT_MANIFEST_HEADER,
  DEFAULT_GENERATED_TYPES_DIR,
  DEFAULT_ROUTES_TYPES_FILENAME,
  DEFAULT_VIRTUAL_TYPES_FILENAME,
  ROUTES_ALIAS_ID,
  ENTRY_ALIAS_ID,
  SERVER_ENTRY_ALIAS_ID,
  VIRTUAL_MANIFEST_ID,
  RESOLVED_VIRTUAL_MANIFEST_ID,
  VIRTUAL_ENTRY_ID,
  RESOLVED_VIRTUAL_ENTRY_ID,
  VIRTUAL_APP_ID,
  RESOLVED_VIRTUAL_APP_ID,
  HTTP_VERBS,
  HTTP_METHODS,
  ROUTE_VERB_PATTERN,
} from "./constants.js";

export {
  taserConfigSchema,
  formattingSchema,
  extensionSchema,
  resolveImportExtension,
  DEFAULT_FORMATTING,
  type TaserConfig,
  type ResolvedTaserConfig,
  type FormattingOptions,
  type ResolvedFormattingOptions,
  type ExtensionOption,
} from "./config.js";

export type {
  GeneratedModel,
  RouteEntry,
  RouteMethodEntry,
  LayoutFile,
  ScanResult,
  HttpVerb,
  HttpMethod,
  RouteFileMethod,
} from "./types.js";

export { ScanError, ScanErrorCollection, formatScanErrors } from "./support/errors.js";

export {
  toPosixPath,
  ensureRelativePrefix,
  createAliasImportRewriter,
  resolveServerDir,
  resolveRoutesDir,
  resolveServerEntry,
  routesImportPrefix,
  type AliasImportRewriterOptions,
} from "./support/paths.js";

export { flattenPlugins } from "./support/plugins.js";

export {
  shouldIgnoreRoutePath,
  assertPhysicalRouteFile,
  isRouteFile,
  getMethodFromRouteFile,
  isHttpVerb,
  classifyRouteFile,
  normalizeRouteRel,
  buildUrlPath,
  layoutIdFromPath,
  layoutImportName,
  routeImportName,
  importPathFromRouteRel,
  layoutImportPathFromRouteRel,
  layoutAppliesToRoute,
  routeLayoutChain,
  layoutParentId,
} from "./scan/paths.js";

export {
  AnalysisCache,
  type AnalysisCacheStats,
  type RouteAnalysis,
  type LayoutAnalysis,
} from "./scan/cache.js";

export {
  walkRouteFiles,
  scanRouteFiles,
  scanSingleRouteFile,
  scanAndBuildModel,
  buildGeneratedModelFromScan,
  analyzeRouteFileSource,
  analyzeRouteFileSourceAsync,
  analyzeLayoutFileSource,
  analyzeLayoutFileSourceAsync,
  createRouteFactoryName,
  collectInvalidRouteParams,
  formatInvalidParamMessage,
  type ScanOptions,
  type ScanAndBuildOptions,
} from "./scan/scan.js";

export {
  scaffoldRouteFile,
  scaffoldRouteFileAtPath,
  routeScaffoldSource,
  layoutScaffoldSource,
  fileNeedsScaffold,
  type ScaffoldOptions,
  type ScaffoldResult,
} from "./scaffold/scaffold.js";

export {
  watchRoutes,
  type WatchRoutesOptions,
  type RouteChangeEvent,
  type RouteChangeBatch,
} from "./watcher/watcher.js";

export {
  emitManifestSource,
  emitVirtualManifestSource,
  emitRouteManifestSource,
  emitTypeDeclarationsSource,
  type EmitManifestOptions,
  type EmitManifestSourceOptions,
  type ManifestEmitKind,
} from "./codegen/emit.js";

export { joinManifestSections } from "./codegen/manifest.js";

export {
  buildClientChainType,
  buildLayoutTreeType,
  buildRouteByPathMethodType,
  buildRouterRegisterAugmentation,
} from "./codegen/types.js";

export { emitVirtualEntrySource, type EmitVirtualEntryOptions } from "./codegen/entry.js";

export {
  emitVirtualDeclarationsSource,
  type EmitVirtualDeclarationsOptions,
} from "./codegen/virtual.js";

export { writeTaserTypes, type TypeWriterState, type WriteTypesOptions } from "./codegen/writer.js";

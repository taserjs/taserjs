export * from "./paths.js";
export * from "./scaffold.js";
export {
  defineConfig,
  resolveConfig,
  resolvePaths,
  type ResolvedTaserConfig,
  type TaserConfig,
  type TaserConfigExport,
  type TaserPaths,
} from "./config-shared.js";
export { renderManifest } from "./render.js";
export type {
  DiscoveredLayout,
  DiscoveredRoute,
  ExpectedExport,
  ScanDiagnostic,
  ScanResult,
} from "./scan-types.js";

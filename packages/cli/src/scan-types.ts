export interface ScanDiagnostic {
  filePath: string;
  message: string;
}

export interface DiscoveredRoute {
  filePath: string;
  absolutePath: string;
  /** Uppercase HTTP verb, e.g. `GET`. */
  method: string;
  canonicalPath: string;
  segmentHierarchy: string[];
}

export interface DiscoveredLayout {
  filePath: string;
  absolutePath: string;
  layoutId: string;
  targetSegment: string;
}

export interface ScanResult {
  routes: DiscoveredRoute[];
  layouts: DiscoveredLayout[];
  diagnostics: ScanDiagnostic[];
}

export type ExpectedExport =
  | { kind: "route"; verb: string; canonicalPath: string }
  | { kind: "layout"; layoutId: string };

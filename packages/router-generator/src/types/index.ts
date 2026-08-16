import type { HttpVerb, RouteFileMethod } from "./http.js";

export type { HttpVerb, RouteFileMethod } from "./http.js";
export { HTTP_VERBS, ROUTE_VERB_PATTERN } from "./http.js";

export type {
  GeneratorConfigFile,
  GeneratorRunOptions,
  ResolvedGeneratorConfig,
} from "../config/schema.js";

export interface LayoutFile {
  id: string;
  importPath: string;
  importName: string;
}

export interface RouteEntry {
  routeRel: string;
  urlPath: string;
  method: RouteFileMethod;
  /** Populated for ANY routes from t.any's methods array. */
  anyMethods?: HttpVerb[];
  layoutChain: string[];
  parentLayout: string | null;
  importName: string;
  importPath: string;
}

export type RouteMethodEntry = {
  method: HttpVerb;
  parentLayout: string | null;
  importName: string;
  /** Source file routeRel that owns this verb after specificity. */
  routeRel: string;
  layoutChain: string[];
};

export type GeneratedModel = {
  layouts: LayoutFile[];
  routes: RouteEntry[];
  layoutIds: string[];
  layoutParents: Map<string, string | null>;
  routePaths: string[];
  routesByPath: Map<string, RouteMethodEntry[]>;
};

export type ScanResult = {
  layouts: LayoutFile[];
  routes: RouteEntry[];
};

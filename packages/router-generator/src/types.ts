import type { HTTP_VERBS } from "./constants.js";
import type { ExtensionOption, FormattingOptions, TaserConfig } from "./config.js";
import type { HttpMethod } from "@taserjs/router-utils/http";

export type { HttpMethod };
export type HttpVerb = (typeof HTTP_VERBS)[number];
export type RouteFileMethod = HttpVerb | "ANY" | "ALL";

export type { TaserConfig, FormattingOptions, ExtensionOption };

export interface LayoutFile {
  id: string;
  importPath: string;
  importName: string;
}

export interface RouteEntry {
  routeRel: string;
  urlPath: string;
  method: RouteFileMethod;
  methods?: HttpVerb[];
  layouts: string[];
  importName: string;
  importPath: string;
}

export type RouteMethodEntry = {
  method: HttpVerb;
  importName: string;
  routeRel: string;
  layouts: string[];
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

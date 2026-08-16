import type { RouteFileMethod } from "../types/http.js";
import { analyzeLayoutFileSource, analyzeRouteFileSource } from "./parse-route-source.js";
import { ScanError } from "../support/errors.js";

export function validateRouteFileExports(
  source: string,
  rawRel: string,
  method: RouteFileMethod,
): ScanError[] {
  return analyzeRouteFileSource(source, rawRel, method).errors;
}

export function validateLayoutFileExports(source: string, rawRel: string): ScanError[] {
  return analyzeLayoutFileSource(source, rawRel).errors;
}

export function parseAnyRouteMethods(
  source: string,
  rawRel: string,
): {
  methods?: import("../types/http.js").HttpVerb[];
  errors: ScanError[];
} {
  const result = analyzeRouteFileSource(source, rawRel, "ANY");
  return {
    errors: result.errors,
    ...(result.anyMethods ? { methods: result.anyMethods } : {}),
  };
}

import { HTTP_VERBS, ROUTE_VERB_PATTERN } from "../types/http.js";
import type { HttpVerb, RouteFileMethod } from "../types/http.js";

export function isRouteFile(filePath: string): boolean {
  return ROUTE_VERB_PATTERN.test(filePath);
}

export function getMethodFromRouteFile(filePath: string): RouteFileMethod {
  const match = filePath.match(ROUTE_VERB_PATTERN);
  if (!match?.[1]) {
    throw new Error(`Unable to parse HTTP method from route file: ${filePath}`);
  }
  return match[1].toUpperCase() as RouteFileMethod;
}

export function isHttpVerb(method: string): method is HttpVerb {
  return (HTTP_VERBS as readonly string[]).includes(method);
}

export function routePathWithoutVerb(routeRel: string): string {
  return routeRel.replace(ROUTE_VERB_PATTERN, "");
}

export function isLayoutFile(routeRel: string): boolean {
  if (isRouteFile(routeRel)) {
    return false;
  }

  const basename = routeRel.replace(/\\/g, "/").split("/").pop() ?? routeRel;
  return basename.endsWith(".ts");
}

export type RouteFileKind = "route" | "layout";

export function classifyRouteFile(relativePath: string): RouteFileKind | null {
  if (isRouteFile(relativePath)) {
    return "route";
  }

  if (isLayoutFile(relativePath)) {
    return "layout";
  }

  return null;
}

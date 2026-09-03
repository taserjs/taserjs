import { basename } from "node:path";
import picomatch from "picomatch";
import { isHttpMethod } from "@taserjs/router-utils/http";
import { DEFAULT_IGNORE, ROUTE_VERB_PATTERN } from "../constants.js";
import { resolveImportExtension, type ExtensionOption } from "../config.js";
import { ScanError } from "../support/errors.js";
import { toPosixPath } from "../support/paths.js";
import type { HttpVerb, LayoutFile, RouteFileMethod } from "../types.js";

const VIRTUAL_CONFIG_PATTERN = /^__virtual\.[mc]?[jt]s$/;
const SPLIT_DOT_REGEX = /(?<!\[)\.(?!\])/g;
const matcherCache = new Map<string, (test: string) => boolean>();

function getMatcher(patterns: readonly string[]): (test: string) => boolean {
  const key = patterns.join("::");
  let matcher = matcherCache.get(key);
  if (!matcher) {
    matcher = picomatch(patterns as string[], { dot: true });
    matcherCache.set(key, matcher);
  }
  return matcher;
}

export function shouldIgnoreRoutePath(
  relPath: string,
  ignorePatterns?: readonly string[],
): boolean {
  const normalized = toPosixPath(relPath).replace(/^\/+/, "");
  const segments = normalized.split("/");

  for (const segment of segments) {
    if (!segment) continue;
    if (segment.startsWith(".")) return true;
    if (VIRTUAL_CONFIG_PATTERN.test(segment)) return true;
  }

  const patterns = ignorePatterns && ignorePatterns.length > 0 ? ignorePatterns : DEFAULT_IGNORE;
  const isMatch = getMatcher(patterns);

  if (isMatch(normalized)) {
    return true;
  }

  let currentPath = "";
  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    if (isMatch(segment) || isMatch(currentPath)) {
      return true;
    }
  }

  return false;
}

export function assertPhysicalRouteFile(rawRel: string): void {
  const fileName = basename(rawRel);
  if (VIRTUAL_CONFIG_PATTERN.test(fileName)) {
    throw new ScanError(
      "Virtual route config files are not supported. Taser uses filesystem routes only.",
      rawRel,
    );
  }
}

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
  return isHttpMethod(method);
}

export function routePathWithoutVerb(routeRel: string): string {
  return routeRel.replace(ROUTE_VERB_PATTERN, "");
}

export function isLayoutFile(routeRel: string): boolean {
  if (isRouteFile(routeRel)) {
    return false;
  }
  const lastSlash = Math.max(routeRel.lastIndexOf("/"), routeRel.lastIndexOf("\\"));
  const base = lastSlash === -1 ? routeRel : routeRel.slice(lastSlash + 1);
  return base.endsWith(".ts");
}

export type RouteFileKind = "route" | "layout";

export function classifyRouteFile(relativePath: string): RouteFileKind | null {
  if (isRouteFile(relativePath)) return "route";
  if (isLayoutFile(relativePath)) return "layout";
  return null;
}

export function splitSegments(pathStr: string): string[] {
  const rawParts = pathStr.split("/");
  const segments: string[] = [];
  for (let i = 0; i < rawParts.length; i++) {
    const part = rawParts[i]!;
    if (part === "") continue;
    if (part.indexOf(".") === -1) {
      segments.push(part);
      continue;
    }
    const subs = part.split(SPLIT_DOT_REGEX);
    for (let j = 0; j < subs.length; j++) {
      const sub = subs[j]!;
      if (sub !== "") segments.push(sub);
    }
  }
  return segments;
}

export function normalizeRouteRel(routeRel: string): string {
  const posix = toPosixPath(routeRel);
  const isRoute = ROUTE_VERB_PATTERN.test(posix);
  const withoutVerb = isRoute ? routePathWithoutVerb(posix) : posix.replace(/\.ts$/, "");
  const extension = isRoute ? posix.slice(withoutVerb.length) : ".ts";

  const segments = splitSegments(withoutVerb);
  if (segments.length === 0) {
    return isRoute ? `index${extension}` : "index.ts";
  }

  return `${segments.join("/")}${extension}`;
}

export function normalizeDynamicSegment(segment: string): string {
  if (segment === "$") {
    return "*";
  }
  if (segment.startsWith("$")) {
    return `:${segment.slice(1)}`;
  }
  return segment;
}

function segmentToUrlPart(segment: string): string | null {
  const hasEscapedLeadingUnderscore =
    segment.startsWith("[_]") || (segment.startsWith("[_") && segment.endsWith("]"));
  const hasEscapedTrailingUnderscore =
    segment.endsWith("[_]") || (segment.endsWith("_]") && segment.startsWith("["));

  if (!hasEscapedLeadingUnderscore && segment.startsWith("_") && !segment.endsWith("_")) {
    return null;
  }

  let unwrapped = segment;
  if (!hasEscapedTrailingUnderscore && segment.endsWith("_") && segment.length > 1) {
    unwrapped = segment.slice(0, -1);
  }

  unwrapped = unwrapped.replace(/\[(.*?)\]/g, "$1");
  return normalizeDynamicSegment(unwrapped);
}

export function buildUrlPath(routeRel: string): string {
  const normalized = normalizeRouteRel(routeRel);
  const withoutVerb = routePathWithoutVerb(normalized);
  const parts = toPosixPath(withoutVerb).split("/");
  const urlSegments: string[] = [];

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]!;
    const isLast = index === parts.length - 1;
    const urlPart = segmentToUrlPart(part);

    if (urlPart === null) {
      continue;
    }

    const isEscapedIndex = part === "[index]";
    if (isLast && urlPart === "index" && !isEscapedIndex) {
      continue;
    }

    urlSegments.push(urlPart);
  }

  if (urlSegments.length === 0) {
    return "/";
  }

  return `/${urlSegments.join("/")}`;
}

export function layoutIdFromPath(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.ts$/, "");
  const segments = splitSegments(toPosixPath(withoutExt));

  if (segments.length === 0) {
    return "/index";
  }

  const mapped = segments.map(normalizeDynamicSegment);
  return `/${mapped.join("/")}`;
}

const pascalCache = new Map<string, string>();

export function segmentToPascal(segment: string): string {
  const cached = pascalCache.get(segment);
  if (cached !== undefined) {
    return cached;
  }
  const clean = segment.replace(/\[(.*?)\]/g, "$1");
  let result: string;
  if (clean === "index") {
    result = "Index";
  } else if (clean === "*") {
    result = "Splat";
  } else if (clean.startsWith(":") || clean.startsWith("$")) {
    const paramName = clean.slice(1);
    result = paramName === "" ? "Param" : paramName.charAt(0).toUpperCase() + paramName.slice(1);
  } else if (clean.startsWith("_")) {
    result = clean.slice(1).charAt(0).toUpperCase() + clean.slice(2);
  } else if (clean.endsWith("_")) {
    const base = clean.slice(0, -1);
    result = base.charAt(0).toUpperCase() + base.slice(1);
  } else {
    const sanitized = clean.replace(/[^a-zA-Z0-9_]/g, "");
    result = sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
  }
  pascalCache.set(segment, result);
  return result;
}

export function layoutImportName(layoutId: string): string {
  if (layoutId === "/index") {
    return "RootIndexLayoutImport";
  }
  if (layoutId === "/*") {
    return "RootSplatLayoutImport";
  }
  const cleanId = layoutId.startsWith("/") ? layoutId.slice(1) : layoutId;
  const parts = cleanId.split("/");
  const name = parts.map(segmentToPascal).join("");
  return `${name}LayoutImport`;
}

export function routeImportName(routeRel: string, method: RouteFileMethod): string {
  const withoutVerb = routePathWithoutVerb(routeRel);
  const parts = toPosixPath(withoutVerb).split("/");
  const pathName = parts.map(segmentToPascal).join("");
  const methodPart = method.charAt(0) + method.slice(1).toLowerCase();

  if (withoutVerb === "index") {
    return `RootIndex${methodPart}RouteImport`;
  }
  return `${pathName}${methodPart}RouteImport`;
}

export function toModuleImportPath(
  routesImportPrefix: string,
  routeRel: string,
  extension: ExtensionOption = true,
): string {
  const withoutExtension = routeRel.replace(/\.ts$/, "").replace(/^\//, "");
  const base = `${routesImportPrefix}/${withoutExtension}`;
  const importExtension = resolveImportExtension(extension);
  return importExtension ? `${base}${importExtension}` : base;
}

export function importPathFromRouteRel(
  routeRel: string,
  routesImportPrefix: string,
  extension: ExtensionOption = true,
): string {
  return toModuleImportPath(routesImportPrefix, routeRel, extension);
}

export function layoutImportPathFromRouteRel(
  routeRel: string,
  routesImportPrefix: string,
  extension: ExtensionOption = true,
): string {
  const withoutExtension = routeRel.replace(/\.ts$/, "").replace(/^\//, "");
  return toModuleImportPath(routesImportPrefix, withoutExtension, extension);
}

function layoutDepth(layoutId: string): number {
  if (layoutId === "/*") return 0;
  if (layoutId === "/index") return 1;
  const cleanId = layoutId.startsWith("/") ? layoutId.slice(1) : layoutId;
  if (cleanId.endsWith("/*")) {
    const prefix = cleanId.slice(0, -2);
    return prefix === "" ? 0 : prefix.split("/").length;
  }
  if (cleanId.endsWith("/index")) {
    return cleanId.split("/").length + 0.5;
  }
  return cleanId.split("/").length;
}

function segmentBase(segment: string): string {
  return segment.endsWith("_") && segment.length > 1 ? segment.slice(0, -1) : segment;
}

export function layoutAppliesToRoute(layoutId: string, routeWithoutVerb: string): boolean {
  if (layoutId === "/*") return true;

  const routeSegments = splitSegments(toPosixPath(routeWithoutVerb));

  if (layoutId === "/index") {
    return (
      routeSegments.length === 0 ||
      (routeSegments.length === 1 && (routeSegments[0] === "index" || routeSegments[0] === ""))
    );
  }

  const cleanLayout = layoutId.startsWith("/") ? layoutId.slice(1) : layoutId;

  if (cleanLayout.endsWith("/*")) {
    const prefix = cleanLayout.slice(0, -2);
    if (prefix === "") return true;
    const prefixSegments = prefix.split("/");
    if (routeSegments.length <= prefixSegments.length) return false;

    for (let i = 0; i < prefixSegments.length; i += 1) {
      const pSeg = prefixSegments[i]!;
      const rSeg = routeSegments[i]!;
      if (pSeg.startsWith(":") || pSeg.startsWith("$")) continue;
      if (segmentBase(pSeg) !== segmentBase(rSeg)) return false;
    }
    return true;
  }

  if (cleanLayout.endsWith("/index")) {
    const layoutWithoutIndex = cleanLayout.slice(0, -"/index".length);
    const joinedRoute = routeSegments.join("/");
    return joinedRoute === cleanLayout || joinedRoute === layoutWithoutIndex;
  }

  const layoutSegments = cleanLayout.split("/");
  if (routeSegments.length < layoutSegments.length) {
    return false;
  }

  for (let i = 0; i < layoutSegments.length; i += 1) {
    const lSeg = layoutSegments[i]!;
    const rSeg = routeSegments[i]!;
    const lBase = segmentBase(lSeg).replace(/^[:$]/, "");
    const rBase = segmentBase(rSeg).replace(/^[:$]/, "");

    if (rSeg.endsWith("_") && rSeg.length > 1 && !lSeg.endsWith("_")) {
      if (i === layoutSegments.length - 1 && rBase === lBase) {
        return false;
      }
    }

    if (lSeg.startsWith(":") || lSeg.startsWith("$")) {
      continue;
    }

    if (lBase !== rBase) {
      return false;
    }
  }

  return true;
}

export function routeLayoutChain(routeWithoutVerb: string, layouts: LayoutFile[]): string[] {
  return layouts
    .filter((layout) => layoutAppliesToRoute(layout.id, routeWithoutVerb))
    .sort((left, right) => layoutDepth(left.id) - layoutDepth(right.id))
    .map((layout) => layout.id);
}

export function layoutParentId(layoutId: string, layoutIds: Set<string>): string | null {
  if (layoutId === "/*") return null;

  const rootId = layoutIds.has("/*") ? "/*" : null;
  if (layoutId === "/index") return rootId;

  const clean = layoutId.startsWith("/") ? layoutId.slice(1) : layoutId;
  const segments = clean.split("/");
  const isWildcard = segments[segments.length - 1] === "*";
  const startDepth = segments.length - 1;

  for (let i = startDepth; i >= 1; i -= 1) {
    const prefix = `/${segments.slice(0, i).join("/")}`;

    if (!isWildcard || i < segments.length - 1) {
      if (layoutIds.has(`${prefix}/*`)) return `${prefix}/*`;
    }

    if (layoutIds.has(prefix)) return prefix;
    if (layoutIds.has(`${prefix}/index`)) return `${prefix}/index`;
  }

  return rootId;
}

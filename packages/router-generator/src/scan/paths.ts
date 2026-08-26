import { basename } from "node:path";
import picomatch from "picomatch";
import { DEFAULT_IGNORE, HTTP_VERBS, ROUTE_VERB_PATTERN } from "../constants.js";
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
  return (HTTP_VERBS as readonly string[]).includes(method);
}

export function routePathWithoutVerb(routeRel: string): string {
  return routeRel.replace(ROUTE_VERB_PATTERN, "");
}

export function isLayoutFile(routeRel: string): boolean {
  if (isRouteFile(routeRel)) {
    return false;
  }
  const base = routeRel.replace(/\\/g, "/").split("/").pop() ?? routeRel;
  return base.endsWith(".ts");
}

export type RouteFileKind = "route" | "layout";

export function classifyRouteFile(relativePath: string): RouteFileKind | null {
  if (isRouteFile(relativePath)) return "route";
  if (isLayoutFile(relativePath)) return "layout";
  return null;
}

export function normalizeRouteRel(routeRel: string): string {
  const posix = toPosixPath(routeRel);
  const isRoute = ROUTE_VERB_PATTERN.test(posix);
  const withoutVerb = isRoute ? routePathWithoutVerb(posix) : posix.replace(/\.ts$/, "");
  const extension = isRoute ? posix.slice(withoutVerb.length) : ".ts";

  const rawParts = withoutVerb.split("/");
  const segments: string[] = [];

  for (const part of rawParts) {
    if (part === "") continue;
    const subSegments = part.split(SPLIT_DOT_REGEX);
    for (const sub of subSegments) {
      if (sub === "") continue;
      segments.push(sub);
    }
  }

  if (segments.length === 0) {
    return isRoute ? `index${extension}` : "index.ts";
  }

  return `${segments.join("/")}${extension}`;
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

  if (unwrapped === "$") {
    return "*";
  }

  if (unwrapped.startsWith("$")) {
    return `:${unwrapped.slice(1)}`;
  }

  return unwrapped;
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
  const posix = toPosixPath(withoutExt);
  return posix === "$" ? "/$" : posix;
}

export function segmentToPascal(segment: string): string {
  const clean = segment.replace(/\[(.*?)\]/g, "$1");
  if (clean === "index") {
    return "Index";
  }
  if (clean.startsWith("_")) {
    return clean.slice(1).charAt(0).toUpperCase() + clean.slice(2);
  }
  if (clean.startsWith("$")) {
    const paramName = clean.slice(1);
    return paramName === "" ? "Splat" : paramName.charAt(0).toUpperCase() + paramName.slice(1);
  }
  if (clean.endsWith("_")) {
    const base = clean.slice(0, -1);
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
  const sanitized = clean.replace(/[^a-zA-Z0-9_]/g, "");
  return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
}

export function layoutImportName(layoutId: string): string {
  if (layoutId === "index") {
    return "RootIndexLayoutImport";
  }
  if (layoutId === "/$") {
    return "RootSplatLayoutImport";
  }
  const parts = layoutId.split("/");
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
  const id = layoutIdFromPath(normalizeRouteRel(routeRel));
  if (routeRel === "$.ts") {
    return toModuleImportPath(routesImportPrefix, "$", extension);
  }
  if (routeRel.endsWith("/$.ts")) {
    return toModuleImportPath(routesImportPrefix, `${id.slice(0, -2)}/$`, extension);
  }
  if (routeRel.endsWith(".$.ts")) {
    return toModuleImportPath(routesImportPrefix, `${id.slice(0, -2)}.$`, extension);
  }
  return toModuleImportPath(routesImportPrefix, id, extension);
}

function layoutDepth(layoutId: string): number {
  if (layoutId === "/$") return 0;
  if (layoutId === "index") return 1;
  if (layoutId.endsWith("/$")) {
    const prefix = layoutId.slice(0, -2);
    return prefix === "" ? 0 : prefix.split("/").length;
  }
  if (layoutId.endsWith("/index")) {
    return layoutId.split("/").length + 0.5;
  }
  return layoutId.split("/").length;
}

function segmentBase(segment: string): string {
  return segment.endsWith("_") && segment.length > 1 ? segment.slice(0, -1) : segment;
}

export function layoutAppliesToRoute(layoutId: string, routeWithoutVerb: string): boolean {
  const route = toPosixPath(routeWithoutVerb);

  if (layoutId === "index") return route === "index";
  if (layoutId === "/$") return true;

  if (layoutId.endsWith("/$")) {
    const prefix = layoutId.slice(0, -2);
    return prefix === "" ? true : route.startsWith(`${prefix}/`);
  }

  if (layoutId.endsWith("/index")) {
    return route === layoutId;
  }

  const layoutSegments = layoutId.split("/");
  const routeSegments = route.split("/");

  if (routeSegments.length < layoutSegments.length) {
    return false;
  }

  for (let i = 0; i < layoutSegments.length; i += 1) {
    const lSeg = layoutSegments[i]!;
    const rSeg = routeSegments[i]!;
    const lBase = segmentBase(lSeg);
    const rBase = segmentBase(rSeg);

    if (rSeg.endsWith("_") && rSeg.length > 1 && !lSeg.endsWith("_")) {
      if (i === layoutSegments.length - 1 && rBase === lBase) {
        return false;
      }
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
  if (layoutId === "/$") return null;
  if (layoutId === "index") return layoutIds.has("/$") ? "/$" : null;

  if (layoutId.endsWith("/index")) {
    const parent = layoutId.slice(0, -"/index".length);
    if (layoutIds.has(parent)) return parent;
    if (layoutIds.has(`${parent}/$`)) return `${parent}/$`;
    return layoutIds.has("/$") ? "/$" : null;
  }

  if (layoutId.endsWith("/$")) {
    const parent = layoutId.slice(0, -2);
    return layoutIds.has(parent) ? parent : layoutIds.has("/$") ? "/$" : null;
  }

  if (!layoutId.includes("/")) {
    return layoutIds.has("/$") ? "/$" : null;
  }

  let current = layoutId.slice(0, layoutId.lastIndexOf("/"));
  while (true) {
    if (layoutIds.has(current)) return current;
    if (!current.includes("/")) break;
    current = current.slice(0, current.lastIndexOf("/"));
  }

  return layoutIds.has("/$") ? "/$" : null;
}

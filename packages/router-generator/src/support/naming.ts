import type { RouteFileMethod } from "../types/http.js";
import { routePathWithoutVerb } from "../scan/classify.js";
import { toPosixPath } from "./paths.js";

export function layoutIdFromPath(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.ts$/, "");
  const posix = toPosixPath(withoutExt);

  if (posix === "$") {
    return "/$";
  }

  return posix;
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
    if (paramName === "") {
      return "Splat";
    }
    return paramName.charAt(0).toUpperCase() + paramName.slice(1);
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

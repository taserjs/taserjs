import { routePathWithoutVerb } from "./classify.js";
import { normalizeRouteRel } from "./normalize.js";
import { toPosixPath } from "../support/paths.js";

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

  // Filename `$` / `$id` → standard UrlFormat `*` / `:id` in the URL path.
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

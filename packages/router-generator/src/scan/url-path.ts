import { routePathWithoutVerb } from "./classify.js";
import { toPosixPath } from "../support/paths.js";

function segmentToUrlPart(segment: string): string | null {
  if (segment.startsWith("_") && !segment.endsWith("_")) {
    return null;
  }

  if (segment.endsWith("_")) {
    return segment.slice(0, -1);
  }

  // Filename `$` / `$id` → standard UrlFormat `*` / `:id` in the URL path.
  if (segment === "$") {
    return "*";
  }

  if (segment.startsWith("$")) {
    return `:${segment.slice(1)}`;
  }

  return segment;
}

export function buildUrlPath(routeRel: string): string {
  const withoutVerb = routePathWithoutVerb(routeRel);
  const parts = toPosixPath(withoutVerb).split("/");
  const urlSegments: string[] = [];

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]!;
    const isLast = index === parts.length - 1;
    const urlPart = segmentToUrlPart(part);

    if (urlPart === null) {
      continue;
    }

    if (isLast && urlPart === "index") {
      continue;
    }

    urlSegments.push(urlPart);
  }

  if (urlSegments.length === 0) {
    return "/";
  }

  return `/${urlSegments.join("/")}`;
}

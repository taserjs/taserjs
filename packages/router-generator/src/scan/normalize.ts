import { ROUTE_VERB_PATTERN } from "../types/http.js";
import { routePathWithoutVerb } from "./classify.js";
import { toPosixPath } from "../support/paths.js";

const SPLIT_DOT_REGEX = /(?<!\[)\.(?!\])/g;

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

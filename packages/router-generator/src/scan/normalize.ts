import { ROUTE_VERB_PATTERN } from "../types/http.js";
import { routePathWithoutVerb } from "./classify.js";
import { flatFileToSegments } from "../support/naming.js";
import { toPosixPath } from "../support/paths.js";

export function normalizeRouteRel(routeRel: string): string {
  const posix = toPosixPath(routeRel);

  if (!posix.includes("/")) {
    return flatFileToCanonicalRel(posix);
  }

  return posix;
}

function flatFileToCanonicalRel(flatPath: string): string {
  const isRoute = ROUTE_VERB_PATTERN.test(flatPath);
  const withoutVerb = isRoute ? routePathWithoutVerb(flatPath) : flatPath.replace(/\.ts$/, "");
  const extension = isRoute ? flatPath.slice(withoutVerb.length) : ".ts";
  const segments = flatFileToSegments(withoutVerb);
  const canonicalSegments = segments.map((segment) => {
    if (segment.endsWith("_") && segment.length > 1 && segments.length > 1) {
      return segment.slice(0, -1);
    }
    return segment;
  });

  return `${canonicalSegments.join("/")}${extension}`;
}

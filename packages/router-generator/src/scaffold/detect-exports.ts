import { MIDDLEWARE_EXPORT_PATTERN, ROUTE_EXPORT_PATTERN } from "../scan/export-patterns.js";

export function fileNeedsScaffold(source: string, kind: "route" | "layout"): boolean {
  const trimmed = source.trim();
  if (trimmed.length === 0) {
    return true;
  }

  if (kind === "route") {
    return !ROUTE_EXPORT_PATTERN.test(source);
  }

  return !MIDDLEWARE_EXPORT_PATTERN.test(source);
}

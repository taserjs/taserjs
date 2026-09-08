/**
 * Normalizes route path patterns from the manifest into Hono-compatible path patterns.
 * Converts `$param` to `:param`, `[...slug]` / `$` / `*` to `*`, collapses duplicate slashes,
 * and standardizes leading and trailing slashes.
 */
export function normalizeRoutePath(pattern: string): string {
  if (!pattern || pattern === "/") {
    return "/";
  }

  // Ensure leading slash
  let path = pattern.startsWith("/") ? pattern : `/${pattern}`;

  // Collapse multiple slashes
  path = path.replace(/\/+/g, "/");

  const segments = path.split("/").map((segment) => {
    // Catch-all patterns: [...slug], $, or *
    if (
      (segment.startsWith("[...") && segment.endsWith("]")) ||
      segment === "$" ||
      segment === "*"
    ) {
      return "*";
    }

    // Dynamic parameter: $param -> :param
    if (segment.startsWith("$") && segment.length > 1) {
      return `:${segment.slice(1)}`;
    }

    return segment;
  });

  const normalized = segments.join("/");

  // Remove trailing slash unless it's root "/"
  if (normalized.length > 1 && normalized.endsWith("/")) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

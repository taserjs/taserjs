export function normalizeRoutePrefix(prefix: string): string {
  if (prefix === "" || prefix === "/" || !prefix.endsWith("/")) {
    return prefix || "/";
  }
  return prefix.slice(0, -1);
}

export function joinRoutePrefix(prefix: string, path: string): string {
  const normalized = normalizeRoutePrefix(prefix);
  if (normalized === "/") {
    return path;
  }
  if (path === "/") {
    return normalized;
  }
  return `${normalized}${path}`;
}

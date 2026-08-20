export function normalizeRoutePrefix(prefix: string): string {
  if (prefix === "" || prefix === "/") {
    return "/";
  }
  return prefix.replace(/\/$/, "");
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

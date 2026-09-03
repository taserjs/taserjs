export function composeBasePath(first?: string, second?: string): string {
  const cleanFirst = (first || "").replace(/\/+$/, "").replace(/^\/+/, "");
  const cleanSecond = (second || "").replace(/\/+$/, "").replace(/^\/+/, "");

  if (cleanFirst && cleanSecond) {
    if (cleanSecond === cleanFirst) {
      return "/" + cleanFirst;
    }
    if (cleanSecond.startsWith(cleanFirst + "/")) {
      return "/" + cleanSecond;
    }
    if (cleanFirst.endsWith("/" + cleanSecond)) {
      return "/" + cleanFirst;
    }
    return `/${cleanFirst}/${cleanSecond}`;
  }
  if (cleanFirst) {
    return "/" + cleanFirst;
  }
  if (cleanSecond) {
    return "/" + cleanSecond;
  }
  return "";
}

/** Normalizes a URL scope prefix for dispatch (strips trailing slashes; `/` becomes undefined). */
export function normalizeScope(scope: string | undefined): string | undefined {
  if (!scope || scope === "/") {
    return undefined;
  }
  return scope.startsWith("/") ? scope.replace(/\/+$/, "") : `/${scope.replace(/\/+$/, "")}`;
}

const UNIVERSAL_MOUNT_PATTERN = /^(\/.*)?\/\*$/;

export class InvalidMountPatternError extends Error {
  constructor(pattern: string) {
    super(`Invalid mount pattern "${pattern}". Use wildcard forms only: "/*" or "/prefix/*".`);
    this.name = "InvalidMountPatternError";
  }
}

function normalizeMountPath(mountPath: string): string {
  if (mountPath === "/") {
    return "/";
  }
  return mountPath.replace(/\/$/, "");
}

export function resolveMountBase(pattern: string): string {
  if (!UNIVERSAL_MOUNT_PATTERN.test(pattern)) {
    throw new InvalidMountPatternError(pattern);
  }

  const wildcardIndex = pattern.lastIndexOf("/*");
  const base = pattern.slice(0, wildcardIndex);
  return base === "" ? "/" : normalizeMountPath(base);
}

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


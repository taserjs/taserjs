import { basename, dirname, normalize } from "pathe";

export const HTTP_METHODS = ["get", "post", "put", "delete", "patch"] as const;
export type HttpMethodLower = (typeof HTTP_METHODS)[number];

export const ROUTE_EXTENSIONS = ["ts", "tsx"] as const;
export type RouteExtension = (typeof ROUTE_EXTENSIONS)[number];

export interface ParsedRouteFileInfo {
  kind: "route";
  filePath: string; // Relative path, e.g. "admin/users.get.ts"
  method: string; // "GET", "POST", etc.
  canonicalPath: string; // "/admin/users"
  segmentHierarchy: string[]; // Hierarchy keys for layout resolution, e.g. ["", "admin", "admin/users"]
}

export interface ParsedLayoutFileInfo {
  kind: "layout";
  filePath: string; // Relative path, e.g. "admin.ts" or "admin/$.ts"
  layoutId: string; // "/*", "/admin/*", "/_auth/*", etc.
  targetSegment: string; // Segment it represents: "", "admin", "_auth", "admin/users"
  isSibling: boolean; // true if admin.ts, false if admin/$.ts
}

export type ParsedFileInfo = ParsedRouteFileInfo | ParsedLayoutFileInfo;

/**
 * Splits a filename stem by unescaped dots, while preserving bracketed literal escapes.
 * E.g. "sitemap[.]xml" -> ["sitemap[.]xml"]
 * E.g. "posts.$id" -> ["posts", "$id"]
 */
export function splitUnescapedDots(stem: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inBracket = false;

  for (let i = 0; i < stem.length; i++) {
    const char = stem[i]!;
    if (char === "[") {
      inBracket = true;
      current += char;
    } else if (char === "]") {
      inBracket = false;
      current += char;
    } else if (char === "." && !inBracket) {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }
  if (current) {
    parts.push(current);
  }
  return parts;
}

/**
 * Unescapes brackets `[...]` into their literal character content.
 * Checks for invalid `[...slug]` syntax and raises an error.
 */
export function unescapeBrackets(segment: string): string {
  if (/\[\.\.\.[^\]]+\]/.test(segment)) {
    throw new Error(
      `Invalid route segment "${segment}": Catch-all splats strictly use "$" (e.g. "$.get.ts" -> "/*"). ` +
        `Bracket syntax "[...]" is exclusively reserved for literal character escaping, and "[...slug]" is not supported.`,
    );
  }
  return segment.replace(/\[([^\]]+)\]/g, "$1");
}

export function isPathlessSegment(rawSegment: string): boolean {
  return rawSegment.startsWith("_") && !rawSegment.startsWith("[_]");
}

/**
 * Normalizes a raw segment to canonical URL segment.
 */
export function normalizeSegmentToUrl(rawSegment: string): {
  urlSegment: string | null;
  isPathless: boolean;
} {
  if (isPathlessSegment(rawSegment)) {
    return { urlSegment: null, isPathless: true };
  }

  const unescaped = unescapeBrackets(rawSegment);

  if (unescaped === "index" && rawSegment === "index") {
    return { urlSegment: null, isPathless: false };
  }

  if (unescaped === "$" && rawSegment === "$") {
    return { urlSegment: "*", isPathless: false };
  }

  if (rawSegment.startsWith("$") && rawSegment.length > 1) {
    return { urlSegment: `:${rawSegment.slice(1)}`, isPathless: false };
  }

  return { urlSegment: unescaped, isPathless: false };
}

/**
 * Checks if a relative file path is ignored (starts with '-' in any segment).
 */
export function isIgnoredPath(relativePath: string): boolean {
  const normalized = normalize(relativePath);
  const segments = normalized.split("/");
  return segments.some((segment) => segment.startsWith("-"));
}

/**
 * Parses file extension and verb from a relative file path.
 */
export function parseFilePath(
  relativePath: string,
  allowedExtensions: readonly string[] = ROUTE_EXTENSIONS,
): {
  dir: string;
  name: string;
  ext: string;
  verb: HttpMethodLower | null;
  stem: string;
} | null {
  const normalized = normalize(relativePath);
  const extMatch = normalized.match(new RegExp(`\\.(${allowedExtensions.join("|")})$`));
  if (!extMatch) {
    return null;
  }

  const ext = extMatch[1]!;
  const withoutExt = normalized.slice(0, -ext.length - 1);
  const dir = dirname(withoutExt) === "." ? "" : dirname(withoutExt);
  const filenameWithoutExt = basename(withoutExt);

  // Check if filename ends with .<verb>
  const parts = splitUnescapedDots(filenameWithoutExt);
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1]!.toLowerCase();
    if (HTTP_METHODS.includes(lastPart as HttpMethodLower)) {
      const verb = lastPart as HttpMethodLower;
      const stem = parts.slice(0, -1).join(".");
      return {
        dir,
        name: filenameWithoutExt,
        ext,
        verb,
        stem,
      };
    }
  }

  return {
    dir,
    name: filenameWithoutExt,
    ext,
    verb: null,
    stem: filenameWithoutExt,
  };
}

/**
 * Derives the canonical URL pattern for a route file.
 */
export function deriveCanonicalUrl(
  dir: string,
  stem: string,
): {
  canonicalPath: string;
  hierarchySegments: string[];
} {
  const rawSegments: string[] = [];

  if (dir) {
    for (const d of dir.split("/")) {
      if (d) rawSegments.push(d);
    }
  }

  const dotParts = splitUnescapedDots(stem);
  for (const p of dotParts) {
    if (p) rawSegments.push(p);
  }

  const urlParts: string[] = [];
  const hierarchyKeys: string[] = [""]; // Root layout always applies
  let currentHierarchy = "";

  for (let i = 0; i < rawSegments.length; i++) {
    const raw = rawSegments[i]!;
    const { urlSegment } = normalizeSegmentToUrl(raw);

    currentHierarchy = currentHierarchy ? `${currentHierarchy}/${raw}` : raw;
    hierarchyKeys.push(currentHierarchy);

    if (urlSegment !== null) {
      urlParts.push(urlSegment);
    }
  }

  let canonicalPath = "/" + urlParts.join("/");
  canonicalPath = canonicalPath.replace(/\/+/g, "/");
  if (canonicalPath.length > 1 && canonicalPath.endsWith("/")) {
    canonicalPath = canonicalPath.slice(0, -1);
  }

  return {
    canonicalPath,
    hierarchySegments: hierarchyKeys,
  };
}

/**
 * Derives layout details from a layout file path.
 */
export function deriveLayoutInfo(
  dir: string,
  stem: string,
  filePath: string,
): ParsedLayoutFileInfo {
  const isNested = stem === "$";
  const targetSegment = isNested ? dir : dir ? `${dir}/${stem}` : stem;
  const isSibling = !isNested;

  let layoutId: string;
  if (targetSegment === "" || targetSegment === "$") {
    layoutId = "/*";
  } else {
    // Convert targetSegment filesystem tokens to canonical URL
    const segments = targetSegment.split("/").map((s) => {
      const { urlSegment } = normalizeSegmentToUrl(s);
      return urlSegment !== null ? urlSegment : s;
    });
    const joined = "/" + segments.join("/").replace(/\/+/g, "/");
    layoutId = `${joined}/*`.replace(/\/+/g, "/");
  }

  return {
    kind: "layout",
    filePath,
    layoutId,
    targetSegment,
    isSibling,
  };
}

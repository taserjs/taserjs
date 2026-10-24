import { basename, dirname, isAbsolute, normalize, relative } from "pathe";

const HTTP_VERBS = new Set([
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "options",
  "query",
  "all",
  "any",
]);

const ROUTE_FILE_PATTERN = /\.(ts|tsx)$/;
const SOURCE_EXTENSION_PATTERN = /\.(ts|tsx|mts|cts|js|mjs|cjs)$/;

/** Splits on dots that are not inside `[...]` escapes: `sitemap[.]xml.get` -> `sitemap[.]xml`, `get`. */
export function splitUnescapedDots(stem: string): string[] {
  return stem.match(/(?:\[[^\]]*\]?|[^.])+/g) ?? [];
}

function unescapeBrackets(segment: string): string {
  if (/\[\.\.\.[^\]]+\]/.test(segment)) {
    throw new Error(
      `Invalid route segment "${segment}": Catch-all splats strictly use "$" (e.g. "$.get.ts" -> "/*"). ` +
        `Bracket syntax "[...]" is exclusively reserved for literal character escaping, and "[...slug]" is not supported.`,
    );
  }
  return segment.replace(/\[([^\]]+)\]/g, "$1");
}

const isPathless = (segment: string) => segment.startsWith("_") && !segment.startsWith("[_]");

/** A trailing `_` outside brackets marks a layout breakout (`task[_]` is not one, `task[_]_` is). */
const isBreakout = (segment: string) => segment.endsWith("_") && segment !== "_";

/** Converts one filesystem segment to a canonical URL segment, or `null` when it adds no URL part. */
function toUrlSegment(raw: string): string | null {
  if (isPathless(raw)) return null;

  const segment = isBreakout(raw) ? raw.slice(0, -1) : raw;
  const unescaped = unescapeBrackets(segment);

  if (segment === "index") return null;
  if (segment === "$") return "*";
  if (segment.startsWith("{-$") && segment.endsWith("}")) return `:${segment.slice(3, -1)}?`;
  if (segment.startsWith("$") && segment.length > 1) return `:${segment.slice(1)}`;
  return unescaped;
}

/** Ignored when any path segment starts with `-`. */
export function isIgnoredPath(relativePath: string): boolean {
  return normalize(relativePath)
    .split("/")
    .some((segment) => segment.startsWith("-"));
}

export interface ParsedFilePath {
  dir: string;
  /** Lowercase HTTP verb from `name.<verb>.ts`; `null` for layout files. */
  verb: string | null;
  stem: string;
}

export function parseFilePath(relativePath: string): ParsedFilePath | null {
  const normalized = normalize(relativePath);
  if (!ROUTE_FILE_PATTERN.test(normalized)) return null;

  const withoutExt = normalized.replace(ROUTE_FILE_PATTERN, "");
  const dir = dirname(withoutExt) === "." ? "" : dirname(withoutExt);
  const name = basename(withoutExt);

  const parts = splitUnescapedDots(name);
  const lastPart = parts.at(-1)?.toLowerCase();
  if (parts.length >= 2 && lastPart && HTTP_VERBS.has(lastPart)) {
    return { dir, verb: lastPart, stem: parts.slice(0, -1).join(".") };
  }
  return { dir, verb: null, stem: name };
}

interface Token {
  /** Segment as written on disk (a breakout `_` suffix on directories is kept). */
  raw: string;
  /** Segment without the stem-level breakout `_` suffix; used for layout lookup keys. */
  clean: string;
  pathless: boolean;
  breakout: boolean;
}

function tokenize(dir: string, stem: string): Token[] {
  const token = (raw: string, breakout: boolean): Token => {
    const clean = breakout ? raw.slice(0, -1) : raw;
    return { raw, clean, breakout, pathless: isPathless(clean) };
  };
  return [
    ...dir
      .split("/")
      .filter(Boolean)
      .map((raw) => token(raw, false)),
    ...splitUnescapedDots(stem).map((raw) => token(raw, isBreakout(raw))),
  ];
}

const keyOf = (tokens: Token[], skipPathless = false) =>
  tokens
    .filter((token) => !skipPathless || !token.pathless)
    .map((token) => token.clean)
    .join("/");

export interface CanonicalUrlInfo {
  canonicalPath: string;
  /** Layout lookup keys from root down to the leaf, minus layouts bypassed by breakout segments. */
  hierarchySegments: string[];
}

export function deriveCanonicalUrl(dir: string, stem: string): CanonicalUrlInfo {
  const tokens = tokenize(dir, stem);

  const urlParts = tokens.map((token) => toUrlSegment(token.raw)).filter((part) => part !== null);
  const canonicalPath = `/${urlParts.join("/")}`.replace(/\/+/g, "/").replace(/(.)\/$/, "$1");

  const candidateKeys = new Set([
    "",
    ...tokens.flatMap((_, i) => {
      const upToHere = tokens.slice(0, i + 1);
      return [keyOf(upToHere), keyOf(upToHere, true)];
    }),
  ]);
  candidateKeys.delete("");

  let excludeRoot = false;
  const excludedPrefixes: string[] = [];
  tokens.forEach((token, i) => {
    if (!token.breakout) return;

    const before = tokens.slice(0, i);
    const isFirstVisible = before.every((t) => t.pathless);

    if (token.clean === "index" && isFirstVisible) {
      excludeRoot = true;
      excludedPrefixes.push("index");
    } else if (token.clean === "index") {
      excludedPrefixes.push(keyOf(before), keyOf(before, true));
    } else {
      const upToHere = tokens.slice(0, i + 1);
      if (isFirstVisible && i === tokens.length - 1) excludeRoot = true;
      excludedPrefixes.push(keyOf(upToHere), keyOf(upToHere, true));
    }
  });

  const prefixes = excludedPrefixes.filter(Boolean);
  const hierarchySegments = [
    ...(excludeRoot ? [] : [""]),
    ...[...candidateKeys].filter(
      (key) => !prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}/`)),
    ),
  ];

  return { canonicalPath, hierarchySegments };
}

export interface LayoutInfo {
  /** Pattern passed to `t.layout()`, e.g. `/admin/*`. */
  layoutId: string;
  /** Hierarchy key the layout attaches to: `""`, `admin`, `_auth`. */
  targetSegment: string;
}

/** `admin.ts` and `admin/$.ts` both target `admin`. */
export function deriveLayoutInfo(dir: string, stem: string): LayoutInfo {
  const targetSegment = stem === "$" ? dir : dir ? `${dir}/${stem}` : stem;
  const urlPath = targetSegment
    .split("/")
    .filter(Boolean)
    .map((segment) => toUrlSegment(segment) ?? segment)
    .join("/");
  return { layoutId: `/${urlPath}/*`.replace(/\/+/g, "/"), targetSegment };
}

/** Relative module specifier from `fromDir` to `targetPath` with the source extension swapped for `ext`. */
export function formatRelativeImport(
  fromDir: string,
  targetPath: string,
  ext: string = "",
): string {
  const relPath = normalize(relative(fromDir, targetPath));
  const specifier = isAbsolute(relPath) || /^\.\.?\//.test(relPath) ? relPath : `./${relPath}`;
  return specifier.replace(SOURCE_EXTENSION_PATTERN, "") + ext;
}

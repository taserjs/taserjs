import {
  compareBySegments,
  deriveCanonicalUrl,
  deriveLayoutInfo,
  isIgnoredPath,
  parseFilePath,
  resolveConfig,
  type DiscoveredLayout,
  type DiscoveredRoute,
  type ResolvedTaserConfig,
  type ScanDiagnostic,
  type ScanResult,
} from "@taserjs/cli/codegen";

import { vfs } from "./vfs";

/**
 * Playground-compatible invocation of the shared CLI config: routes live at
 * `/routes`, the manifest is generated to `/.taserjs/routes.gen.ts`, and the
 * app file is `/taser.ts`. Imports are emitted extension-less; the playground
 * bundle resolver maps them to `.ts`.
 */
export const PLAYGROUND_CONFIG: ResolvedTaserConfig = resolveConfig({
  serverDir: "/",
  routesDir: "routes",
  outputDir: ".taserjs",
  app: "taser.ts",
  extension: false,
});

const ROUTES_PREFIX = "/routes/";
const MANIFEST_PATH = "/.taserjs/routes.gen.ts";

const HTTP_VERBS = "get post put delete patch options query all any".split(" ");
const ROOT_CALL_FRAGMENT = `\\bt\\s*\\.\\s*(${HTTP_VERBS.join("|")}|layout)\\s*\\(\\s*(?:"([^"]*)"|'([^']*)'|\`([^\`$]*)\`)`;
const EXPORT_DEFAULT_CALL_RE = new RegExp(`\\bexport\\s+default\\s+${ROOT_CALL_FRAGMENT}`);
const EXPORT_DEFAULT_IDENT_RE = /\bexport\s+default\s+([A-Za-z_$][\w$]*)\b/;
const ANY_ROOT_CALL_RE = new RegExp(ROOT_CALL_FRAGMENT);

/**
 * Strips `//` and `/* ... *\/` comments while keeping string and template literals
 * intact so patterns like `t.layout("/*")` followed by a block comment stay valid.
 */
function stripCommentsOutsideStrings(source: string): string {
  let out = "";
  let i = 0;
  let quote: '"' | "'" | "`" | null = null;

  while (i < source.length) {
    const ch = source[i]!;
    const next = source[i + 1];

    if (quote !== null) {
      out += ch;
      if (ch === "\\" && i + 1 < source.length) {
        out += next!;
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === "/" && next === "/") {
      i += 2;
      while (i < source.length && source[i] !== "\n") i += 1;
      continue;
    }

    if (ch === "/" && next === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i += 1;
      i += 2;
      out += " ";
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

function matchToCall(match: RegExpExecArray | null): { verb: string; path: string } | null {
  if (!match) return null;
  const path = (match[2] ?? match[3] ?? match[4]) as string;
  return { verb: match[1]!, path };
}

/**
 * Extracts the string-argument of the default-exported `t.<verb>(...)` / `t.layout(...)`
 * call. Browser equivalent of the CLI's oxc-parser based `findRootCall` +
 * `staticString`; supports quoted literals and interpolation-free templates.
 */
export function extractRootCall(content: string): { verb: string; path: string } | null {
  const cleaned = stripCommentsOutsideStrings(content);

  const directDefault = matchToCall(EXPORT_DEFAULT_CALL_RE.exec(cleaned));
  if (directDefault) return directDefault;

  const identMatch = EXPORT_DEFAULT_IDENT_RE.exec(cleaned);
  if (identMatch?.[1]) {
    const escapedIdent = identMatch[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const bindingRe = new RegExp(
      `\\b(?:const|let|var)\\s+${escapedIdent}\\s*=\\s*${ROOT_CALL_FRAGMENT}`,
    );
    const boundDefault = matchToCall(bindingRe.exec(cleaned));
    if (boundDefault) return boundDefault;
  }

  return matchToCall(ANY_ROOT_CALL_RE.exec(cleaned));
}

/**
 * Browser-side scanner that produces the same `ScanResult` model as the CLI's
 * oxc-based one, in the shape `renderManifest` (shared with the CLI) expects.
 * Limitation vs the CLI: route/layout paths are extracted by regex, so exotic
 * route definitions (dynamic `t.get(\`/x${var}\`)`, aliased builders) are not
 * statically detectable and surface as diagnostics.
 */
export function scanProject(): ScanResult {
  const routes: DiscoveredRoute[] = [];
  const layouts: DiscoveredLayout[] = [];
  const diagnostics: ScanDiagnostic[] = [];

  for (const path of vfs.list()) {
    if (!path.startsWith(ROUTES_PREFIX)) continue;
    const filePath = path.slice(ROUTES_PREFIX.length);
    if (isIgnoredPath(filePath)) continue;

    const content = vfs.read(path);
    if (content === undefined || content.trim() === "") continue;

    const parsed = parseFilePath(filePath);
    if (!parsed) continue;

    if (parsed.verb === null && parsed.stem.endsWith("_")) {
      diagnostics.push({
        filePath,
        message: `Invalid layout file "${filePath}": layout files cannot have trailing underscores.`,
      });
      continue;
    }

    const found = extractRootCall(content);
    try {
      if (parsed.verb !== null) {
        const { canonicalPath, hierarchySegments } = deriveCanonicalUrl(parsed.dir, parsed.stem);
        if (!found) {
          diagnostics.push({
            filePath,
            message: `Could not statically parse the route path in "${filePath}". Use a string literal, e.g. t.${parsed.verb}(${JSON.stringify(canonicalPath)}).`,
          });
        } else if (found.verb === "layout") {
          diagnostics.push({
            filePath,
            message: `Route file "${filePath}" has a ".${parsed.verb}" suffix but exports t.layout(...).`,
          });
        } else {
          if (found.verb !== parsed.verb && found.verb !== "any" && found.verb !== "all") {
            diagnostics.push({
              filePath,
              message: `Mismatched HTTP method in "${filePath}": file name specifies ".${parsed.verb}", but the export defines t.${found.verb}(...).`,
            });
          }
          if (found.path !== canonicalPath) {
            diagnostics.push({
              filePath,
              message: `Mismatched route path in "${filePath}": expected "${canonicalPath}" (derived from the file name), but received "${found.path}".`,
            });
          }
        }
        routes.push({
          filePath,
          absolutePath: path,
          method: parsed.verb.toUpperCase(),
          canonicalPath,
          segmentHierarchy: hierarchySegments,
        });
      } else {
        const layout = deriveLayoutInfo(parsed.dir, parsed.stem);
        if (found?.verb !== "layout") {
          diagnostics.push({
            filePath,
            message: `Non-route file "${filePath}" must export default t.layout("${layout.layoutId}"). Prefix the file with "-" to ignore it.`,
          });
        } else if (found.path !== layout.layoutId) {
          diagnostics.push({
            filePath,
            message: `Mismatched layout pattern in "${filePath}": expected "${layout.layoutId}", but received "${found.path}".`,
          });
        }
        layouts.push({ filePath, absolutePath: path, ...layout });
      }
    } catch (err) {
      diagnostics.push({ filePath, message: (err as Error).message });
    }
  }

  routes.sort((a, b) => compareBySegments(a.filePath, b.filePath));
  layouts.sort((a, b) => compareBySegments(a.filePath, b.filePath));

  const seen = new Set<string>();
  for (const layout of layouts) {
    if (seen.has(layout.targetSegment)) {
      diagnostics.push({
        filePath: layout.filePath,
        message: `Layout collision: multiple layouts defined for segment "${layout.targetSegment}".`,
      });
    }
    seen.add(layout.targetSegment);
  }
  seen.clear();
  for (const route of routes) {
    const key = `${route.method} ${route.canonicalPath}`;
    if (seen.has(key)) {
      diagnostics.push({
        filePath: route.filePath,
        message: `Route collision: ${key} is defined in more than one file.`,
      });
    }
    seen.add(key);
  }

  return { routes, layouts, diagnostics };
}

export { MANIFEST_PATH };

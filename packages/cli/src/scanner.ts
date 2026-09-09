import { readdirSync, readFileSync, statSync } from "node:fs";
import { posix, resolve } from "node:path";
import { parseSync } from "oxc-parser";
import {
  deriveCanonicalUrl,
  deriveLayoutInfo,
  isIgnoredPath,
  parseFilePath,
  type ParsedLayoutFileInfo,
  type ParsedRouteFileInfo,
} from "./paths.js";

export interface ScanDiagnostic {
  filePath: string;
  message: string;
  line?: number | undefined;
  column?: number | undefined;
}

export interface DiscoveredRoute extends ParsedRouteFileInfo {
  absolutePath: string;
}

export interface DiscoveredLayout extends ParsedLayoutFileInfo {
  absolutePath: string;
}

export interface ScanResult {
  routes: DiscoveredRoute[];
  layouts: DiscoveredLayout[];
  diagnostics: ScanDiagnostic[];
}

export interface ScanOptions {
  routesDir: string;
  cwd?: string | undefined;
  extensions?: string[] | undefined;
}

function findRootCall(node: any): { rootMethod: string | null; rootArgs: any[] } | null {
  let curr = node;
  while (curr) {
    if (curr.type === "CallExpression") {
      const callee = curr.callee;
      if (callee.type === "MemberExpression") {
        if (
          callee.object.type === "Identifier" &&
          (callee.object.name === "t" || callee.object.name === "router")
        ) {
          return {
            rootMethod: callee.property.name,
            rootArgs: curr.arguments,
          };
        }
        curr = callee.object;
      } else if (callee.type === "Identifier") {
        return {
          rootMethod: callee.name,
          rootArgs: curr.arguments,
        };
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return null;
}

function extractStringLiteralValue(arg: any): string | null {
  if (!arg) return null;
  if (arg.type === "Literal" && typeof arg.value === "string") {
    return arg.value;
  }
  if (arg.type === "TemplateLiteral" && arg.expressions.length === 0 && arg.quasis.length === 1) {
    return arg.quasis[0].value.raw;
  }
  return null;
}

function getVariableInit(programBody: any[], name: string): any | null {
  for (const stmt of programBody) {
    if (stmt.type === "VariableDeclaration") {
      for (const decl of stmt.declarations) {
        if (decl.id.type === "Identifier" && decl.id.name === name) {
          return decl.init;
        }
      }
    }
  }
  return null;
}

export function validateAst(
  filePath: string,
  content: string,
  expectedKind: "route" | "layout",
  expectedVerb: string | null,
  canonicalPath: string,
  layoutId?: string,
): ScanDiagnostic[] {
  const diagnostics: ScanDiagnostic[] = [];

  const parseResult = parseSync(filePath, content);
  if (parseResult.errors && parseResult.errors.length > 0) {
    for (const err of parseResult.errors) {
      diagnostics.push({
        filePath,
        message: `Parse error: ${err.message}`,
      });
    }
    return diagnostics;
  }

  const defaultExport = parseResult.program.body.find(
    (node: any) => node.type === "ExportDefaultDeclaration",
  ) as any;

  if (!defaultExport) {
    diagnostics.push({
      filePath,
      message:
        expectedKind === "route"
          ? `Missing default export in route file "${filePath}". Route files must export default a route definition (e.g. "export default t.${expectedVerb?.toLowerCase()}("${canonicalPath}").handler(...)").`
          : `Missing default export in layout file "${filePath}". Layout files must export default a layout definition (e.g. "export default t.layout(...)"). Non-verb files that are not layouts must be prefixed with "-" to be ignored.`,
    });
    return diagnostics;
  }

  let decl = defaultExport.declaration;
  if (decl.type === "Identifier") {
    const init = getVariableInit(parseResult.program.body, decl.name);
    if (init) {
      decl = init;
    }
  }

  const rootCall = findRootCall(decl);
  if (!rootCall || !rootCall.rootMethod) {
    diagnostics.push({
      filePath,
      message:
        expectedKind === "route"
          ? `Invalid default export in route file "${filePath}". Expected "export default t.${expectedVerb?.toLowerCase()}("${canonicalPath}")..."`
          : `Invalid default export in layout file "${filePath}". Expected "export default t.layout(...)". Non-verb files that are not layouts must be prefixed with "-" to be ignored.`,
    });
    return diagnostics;
  }

  const actualMethod = rootCall.rootMethod.toLowerCase();

  if (expectedKind === "route") {
    const exp = expectedVerb?.toLowerCase();
    if (actualMethod !== exp) {
      diagnostics.push({
        filePath,
        message: `Mismatched HTTP method in "${filePath}": File name specifies verb ".${exp}", but default export defines "t.${actualMethod}(...)". Expected "export default t.${exp}("${canonicalPath}")...".`,
      });
      return diagnostics;
    }

    const firstArg = rootCall.rootArgs[0];
    const passedPath = extractStringLiteralValue(firstArg);

    if (passedPath === null) {
      diagnostics.push({
        filePath,
        message: `Route definition in "${filePath}" must provide a static string path argument matching canonical URL "${canonicalPath}" (e.g. "t.${exp}("${canonicalPath}")").`,
      });
      return diagnostics;
    }

    if (passedPath.includes("$")) {
      diagnostics.push({
        filePath,
        message: `Route definition in "${filePath}" contains filesystem tokens like "$param" ("${passedPath}"). Route builders strictly accept Canonical URL Patterns (e.g. "${canonicalPath}").`,
      });
      return diagnostics;
    }

    if (passedPath !== canonicalPath) {
      diagnostics.push({
        filePath,
        message: `Mismatched route path in "${filePath}": Expected path "${canonicalPath}" derived from filesystem, but received "${passedPath}".`,
      });
      return diagnostics;
    }
  } else {
    // Layout file
    if (actualMethod !== "layout") {
      diagnostics.push({
        filePath,
        message: `Invalid default export in layout file "${filePath}": Layout files must export default "t.layout(...)". Found "t.${actualMethod}(...)". Non-verb files that are not layouts must be prefixed with "-" to be ignored.`,
      });
      return diagnostics;
    }

    const firstArg = rootCall.rootArgs[0];
    const passedPath = extractStringLiteralValue(firstArg);

    if (passedPath === null) {
      diagnostics.push({
        filePath,
        message: `Layout definition in "${filePath}" must provide a static string path argument matching canonical layout pattern "${layoutId}" (e.g. "t.layout("${layoutId}")").`,
      });
      return diagnostics;
    }

    if (passedPath.includes("$")) {
      diagnostics.push({
        filePath,
        message: `Layout definition in "${filePath}" contains filesystem tokens like "$param" ("${passedPath}"). Layouts accept Canonical URL Patterns.`,
      });
      return diagnostics;
    }

    if (layoutId && passedPath !== layoutId) {
      diagnostics.push({
        filePath,
        message: `Mismatched layout path in "${filePath}": Expected path pattern "${layoutId}" derived from filesystem, but received "${passedPath}".`,
      });
      return diagnostics;
    }
  }

  return diagnostics;
}

export function scanRoutes(options: ScanOptions): ScanResult {
  const cwd = options.cwd ?? process.cwd();
  const fullRoutesDir = resolve(cwd, options.routesDir);
  const extensions = options.extensions ?? ["ts", "tsx"];

  const routes: DiscoveredRoute[] = [];
  const layouts: DiscoveredLayout[] = [];
  const diagnostics: ScanDiagnostic[] = [];

  function walk(currentDir: string, relativeDir: string) {
    let entries: string[] = [];
    try {
      entries = readdirSync(currentDir);
    } catch {
      // Directory may not exist yet
      return;
    }

    for (const entry of entries) {
      const entryRelPath = relativeDir ? posix.join(relativeDir, entry) : entry;
      const entryFullPath = resolve(currentDir, entry);

      if (isIgnoredPath(entryRelPath)) {
        continue;
      }

      const stat = statSync(entryFullPath);
      if (stat.isDirectory()) {
        walk(entryFullPath, entryRelPath);
      } else if (stat.isFile()) {
        const parsed = parseFilePath(entryRelPath, extensions);
        if (!parsed) {
          // File does not match extensions
          continue;
        }

        const content = readFileSync(entryFullPath, "utf-8");

        try {
          if (parsed.verb !== null) {
            // Route file
            const { canonicalPath, hierarchySegments } = deriveCanonicalUrl(
              parsed.dir,
              parsed.stem,
            );
            const method = parsed.verb.toUpperCase();

            const astDiags = validateAst(
              entryRelPath,
              content,
              "route",
              parsed.verb,
              canonicalPath,
            );
            diagnostics.push(...astDiags);

            routes.push({
              kind: "route",
              filePath: entryRelPath,
              absolutePath: entryFullPath,
              method,
              canonicalPath,
              segmentHierarchy: hierarchySegments,
            });
          } else {
            // Layout file
            const layoutInfo = deriveLayoutInfo(parsed.dir, parsed.stem, entryRelPath);
            const astDiags = validateAst(
              entryRelPath,
              content,
              "layout",
              null,
              "",
              layoutInfo.layoutId,
            );
            diagnostics.push(...astDiags);

            layouts.push({
              ...layoutInfo,
              absolutePath: entryFullPath,
            });
          }
        } catch (err: any) {
          diagnostics.push({
            filePath: entryRelPath,
            message: err.message,
          });
        }
      }
    }
  }

  walk(fullRoutesDir, "");

  // Collision detection:
  // 1. Sibling layout vs Nested layout collision
  const layoutSegments = new Map<string, DiscoveredLayout>();
  for (const layout of layouts) {
    const key = layout.targetSegment;
    const existing = layoutSegments.get(key);
    if (existing) {
      diagnostics.push({
        filePath: layout.filePath,
        message: `Layout collision detected: Multiple layouts defined for segment "${key || "/"}": "${existing.filePath}" and "${layout.filePath}". Sibling layouts (e.g. admin.ts) and nested layouts (e.g. admin/$.ts) are mutually exclusive.`,
      });
    } else {
      layoutSegments.set(key, layout);
    }
  }

  // 2. Route collisions (same canonicalPath + same HTTP method)
  const routeMap = new Map<string, DiscoveredRoute>();
  for (const route of routes) {
    const key = `${route.method} ${route.canonicalPath}`;
    const existing = routeMap.get(key);
    if (existing) {
      diagnostics.push({
        filePath: route.filePath,
        message: `Route collision detected: Method and path "${key}" is defined in multiple files: "${existing.filePath}" and "${route.filePath}". Conflicting route patterns must be resolved.`,
      });
    } else {
      routeMap.set(key, route);
    }
  }

  return {
    routes,
    layouts,
    diagnostics,
  };
}

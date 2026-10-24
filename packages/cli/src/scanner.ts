import { readdirSync, readFileSync, writeFileSync } from "node:fs";

import { parseSync } from "oxc-parser";
import { join, relative, resolve } from "pathe";

import {
  deriveCanonicalUrl,
  deriveLayoutInfo,
  isIgnoredPath,
  parseFilePath,
  type ParsedFilePath,
} from "./paths.js";
import { layoutStub, routeStub } from "./scaffold.js";

export interface ScanDiagnostic {
  filePath: string;
  message: string;
}

export interface DiscoveredRoute {
  filePath: string;
  absolutePath: string;
  /** Uppercase HTTP verb, e.g. `GET`. */
  method: string;
  canonicalPath: string;
  segmentHierarchy: string[];
}

export interface DiscoveredLayout {
  filePath: string;
  absolutePath: string;
  layoutId: string;
  targetSegment: string;
}

export interface ScanResult {
  routes: DiscoveredRoute[];
  layouts: DiscoveredLayout[];
  diagnostics: ScanDiagnostic[];
}

export interface ScanOptions {
  routesDir: string;
  cwd?: string | undefined;
  /** Fill empty route and layout files with starter stubs. */
  scaffold?: boolean | undefined;
}

export type ExpectedExport =
  | { kind: "route"; verb: string; canonicalPath: string }
  | { kind: "layout"; layoutId: string };

const NOT_A_LAYOUT_HINT =
  'Non-verb files that are not layouts must be prefixed with "-" to be ignored.';

const layoutUnderscoreDiagnostic = (filePath: string): ScanDiagnostic => ({
  filePath,
  message: `Invalid layout file "${filePath}": Layout files cannot have trailing underscores. Layout breakout syntax ("segment_") is strictly reserved for routes. For parallel layout chains, use pathless layout groups (e.g. "_auth.ts", "_public.ts").`,
});

/** Walks `t.get("/x").use(...).handler(...)` down to the root `t.get("/x")` call. */
function findRootCall(node: any): { method: string; args: any[] } | null {
  for (let current = node; current?.type === "CallExpression"; current = current.callee.object) {
    const { callee } = current;
    if (callee.type === "Identifier") return { method: callee.name, args: current.arguments };
    if (callee.type !== "MemberExpression") return null;
    if (callee.object.type === "Identifier" && callee.object.name === "t") {
      return { method: callee.property.name, args: current.arguments };
    }
  }
  return null;
}

function staticString(arg: any): string | null {
  if (arg?.type === "Literal" && typeof arg.value === "string") return arg.value;
  if (arg?.type === "TemplateLiteral" && arg.expressions.length === 0)
    return arg.quasis[0].value.raw;
  return null;
}

/** Checks that the file's default export is the builder call its filename promises. */
export function validateAst(
  filePath: string,
  content: string,
  expected: ExpectedExport,
): ScanDiagnostic[] {
  const fail = (message: string): ScanDiagnostic[] => [{ filePath, message }];

  const { program, errors } = parseSync(filePath, content);
  if (errors.length > 0) {
    return errors.map((err) => ({ filePath, message: `Parse error: ${err.message}` }));
  }

  const isRoute = expected.kind === "route";
  const noun = isRoute ? "route" : "layout";
  const expectedPath = isRoute ? expected.canonicalPath : expected.layoutId;
  const verb = isRoute ? expected.verb : "layout";
  const example = isRoute ? `t.${verb}("${expectedPath}")` : "t.layout(...)";
  const hint = isRoute ? "" : ` ${NOT_A_LAYOUT_HINT}`;

  const exported = program.body.find(
    (node: any) => node.type === "ExportDefaultDeclaration",
  ) as any;
  if (!exported) {
    return fail(
      `Missing default export in ${noun} file "${filePath}". ${isRoute ? "Route files must export default a route definition" : "Layout files must export default a layout definition"} (e.g. "export default ${example}${isRoute ? ".handler(...)" : ""}").${hint}`,
    );
  }

  let declaration = exported.declaration;
  if (declaration.type === "Identifier") {
    const variable = program.body
      .flatMap((node: any) => (node.type === "VariableDeclaration" ? node.declarations : []))
      .find((d: any) => d.id.type === "Identifier" && d.id.name === declaration.name);
    declaration = variable?.init ?? declaration;
  }

  const root = findRootCall(declaration);
  if (!root) {
    return fail(
      `Invalid default export in ${noun} file "${filePath}". Expected "export default ${example}${isRoute ? "..." : ""}".${hint}`,
    );
  }

  const actual = root.method.toLowerCase();
  const verbMatches = isRoute ? actual === verb || actual === "any" : actual === "layout";
  if (!verbMatches) {
    return fail(
      isRoute
        ? `Mismatched HTTP method in "${filePath}": File name specifies verb ".${verb}", but default export defines "t.${actual}(...)". Expected "export default ${example}...".`
        : `Invalid default export in layout file "${filePath}": Layout files must export default "t.layout(...)". Found "t.${actual}(...)".${hint}`,
    );
  }

  const passedPath = staticString(root.args[0]);
  const Noun = isRoute ? "Route" : "Layout";
  if (passedPath === null) {
    return fail(
      `${Noun} definition in "${filePath}" must provide a static string path argument matching canonical ${isRoute ? "URL" : "layout pattern"} "${expectedPath}" (e.g. "${isRoute ? example : `t.layout("${expectedPath}")`}").`,
    );
  }
  if (passedPath.includes("$")) {
    return fail(
      `${Noun} definition in "${filePath}" contains filesystem tokens like "$param" ("${passedPath}"). Expected canonical URL pattern (e.g. "${expectedPath}").`,
    );
  }
  if (passedPath !== expectedPath) {
    return fail(
      `Mismatched ${noun} path in "${filePath}": Expected path pattern "${expectedPath}" derived from filesystem, but received "${passedPath}".`,
    );
  }
  if (isRoute && actual === "any" && root.args.length < 2) {
    return fail(
      `Route definition for "t.any" in "${filePath}" must provide an array of HTTP methods as the second argument (e.g. 't.any("${expectedPath}", ["GET", "POST"])').`,
    );
  }

  return [];
}

interface SourceFile {
  filePath: string;
  absolutePath: string;
  parsed: ParsedFilePath;
}

const compareBySegments = (a: string, b: string): number => {
  const left = a.split("/");
  const right = b.split("/");
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    if (left[i] !== right[i]) return left[i]! < right[i]! ? -1 : 1;
  }
  return left.length - right.length;
};

/** Lists route and layout candidates in a stable, directory-first order. */
function discoverFiles(routesDir: string): SourceFile[] {
  let entries;
  try {
    entries = readdirSync(routesDir, { recursive: true, withFileTypes: true });
  } catch {
    return []; // routes directory may not exist yet
  }

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .map((absolutePath) => ({ absolutePath, filePath: relative(routesDir, absolutePath) }))
    .filter(({ filePath }) => !isIgnoredPath(filePath))
    .flatMap((file) => {
      const parsed = parseFilePath(file.filePath);
      return parsed ? [{ ...file, parsed }] : [];
    })
    .sort((a, b) => compareBySegments(a.filePath, b.filePath));
}

function readSource(file: SourceFile, scaffold: boolean, stub: () => string): string {
  const content = readFileSync(file.absolutePath, "utf-8");
  if (!scaffold || content.trim().length > 0) return content;
  const generated = stub();
  writeFileSync(file.absolutePath, generated, "utf-8");
  return generated;
}

function findDuplicates<T extends { filePath: string }>(
  items: T[],
  keyOf: (item: T) => string,
  describe: (key: string, first: T, duplicate: T) => string,
): ScanDiagnostic[] {
  const seen = new Map<string, T>();
  const diagnostics: ScanDiagnostic[] = [];
  for (const item of items) {
    const key = keyOf(item);
    const first = seen.get(key);
    if (first) diagnostics.push({ filePath: item.filePath, message: describe(key, first, item) });
    else seen.set(key, item);
  }
  return diagnostics;
}

export function scanRoutes(options: ScanOptions): ScanResult {
  const routesDir = resolve(options.cwd ?? process.cwd(), options.routesDir);
  const scaffold = Boolean(options.scaffold);

  const routes: DiscoveredRoute[] = [];
  const layouts: DiscoveredLayout[] = [];
  const diagnostics: ScanDiagnostic[] = [];

  for (const file of discoverFiles(routesDir)) {
    const { filePath, absolutePath, parsed } = file;

    if (parsed.verb === null && parsed.stem.endsWith("_")) {
      diagnostics.push(layoutUnderscoreDiagnostic(filePath));
      continue;
    }

    try {
      if (parsed.verb !== null) {
        const { canonicalPath, hierarchySegments } = deriveCanonicalUrl(parsed.dir, parsed.stem);
        const content = readSource(file, scaffold, () => routeStub(parsed.verb!, canonicalPath));
        diagnostics.push(
          ...validateAst(filePath, content, { kind: "route", verb: parsed.verb, canonicalPath }),
        );
        routes.push({
          filePath,
          absolutePath,
          method: parsed.verb.toUpperCase(),
          canonicalPath,
          segmentHierarchy: hierarchySegments,
        });
      } else {
        const layout = deriveLayoutInfo(parsed.dir, parsed.stem);
        const content = readSource(file, scaffold, () => layoutStub(layout.layoutId));
        diagnostics.push(
          ...validateAst(filePath, content, { kind: "layout", layoutId: layout.layoutId }),
        );
        layouts.push({ filePath, absolutePath, ...layout });
      }
    } catch (err) {
      diagnostics.push({ filePath, message: (err as Error).message });
    }
  }

  diagnostics.push(
    ...findDuplicates(
      layouts,
      (layout) => layout.targetSegment,
      (segment, first, duplicate) =>
        `Layout collision detected: Multiple layouts defined for segment "${segment || "/"}": "${first.filePath}" and "${duplicate.filePath}". Sibling layouts (e.g. admin.ts) and nested layouts (e.g. admin/$.ts) are mutually exclusive.`,
    ),
    ...findDuplicates(
      routes,
      (route) => `${route.method} ${route.canonicalPath}`,
      (key, first, duplicate) =>
        `Route collision detected: Method and path "${key}" is defined in multiple files: "${first.filePath}" and "${duplicate.filePath}". Conflicting route patterns must be resolved.`,
    ),
  );

  return { routes, layouts, diagnostics };
}

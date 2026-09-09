import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, posix, relative, resolve } from "node:path";
import { parseSync } from "oxc-parser";
import type { ResolvedTaserConfig } from "./config.js";
import type { DiscoveredLayout, DiscoveredRoute, ScanResult } from "./scanner.js";

export interface GenerateResult {
  manifestPath: string;
  typesPath: string;
  manifestWritten: boolean;
  typesWritten: boolean;
  content: string;
  typesContent: string;
}

// In-memory content hash cache to prevent watch loop thrashing
const contentHashCache = new Map<string, string>();

function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

function safeWriteFile(filePath: string, content: string): boolean {
  const hash = hashContent(content);
  const cachedHash = contentHashCache.get(filePath);

  if (cachedHash === hash) {
    return false;
  }

  if (existsSync(filePath)) {
    try {
      const existing = readFileSync(filePath, "utf-8");
      if (existing === content) {
        contentHashCache.set(filePath, hash);
        return false;
      }
    } catch {
      // Ignore read errors and proceed to write
    }
  }

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf-8");
  contentHashCache.set(filePath, hash);
  return true;
}

export function resolveLayoutsForRoute(
  route: DiscoveredRoute,
  layoutsBySegment: Map<string, DiscoveredLayout>,
): string[] {
  const matchingLayoutIds: string[] = [];

  for (const seg of route.segmentHierarchy) {
    const layout = layoutsBySegment.get(seg);
    if (layout) {
      if (!matchingLayoutIds.includes(layout.layoutId)) {
        matchingLayoutIds.push(layout.layoutId);
      }
    }
  }

  return matchingLayoutIds;
}

export function inspectContextExports(contextFilePath: string): {
  hasAppContextType: boolean;
  hasContextConst: boolean;
  hasDefaultExport: boolean;
} {
  try {
    const code = readFileSync(contextFilePath, "utf-8");
    const parsed = parseSync(contextFilePath, code);
    let hasAppContextType = false;
    let hasContextConst = false;
    let hasDefaultExport = false;

    for (const stmt of parsed.program.body) {
      if (stmt.type === "ExportNamedDeclaration") {
        if (stmt.declaration) {
          if (
            (stmt.declaration.type === "TSTypeAliasDeclaration" ||
              stmt.declaration.type === "TSInterfaceDeclaration") &&
            stmt.declaration.id?.name === "AppContext"
          ) {
            hasAppContextType = true;
          }
          if (stmt.declaration.type === "VariableDeclaration") {
            for (const decl of stmt.declaration.declarations) {
              if (
                decl.id &&
                "name" in decl.id &&
                typeof (decl.id as { name?: unknown }).name === "string" &&
                (decl.id as { name: string }).name === "context"
              ) {
                hasContextConst = true;
              }
            }
          }
        }
        if (stmt.specifiers) {
          for (const spec of stmt.specifiers) {
            const exportedName =
              spec.exported && "name" in spec.exported
                ? (spec.exported as { name: string }).name
                : spec.exported && "value" in spec.exported
                  ? (spec.exported as { value: string }).value
                  : undefined;
            if (exportedName === "AppContext") {
              hasAppContextType = true;
            }
            if (exportedName === "context") {
              hasContextConst = true;
            }
          }
        }
      }
      if (stmt.type === "ExportDefaultDeclaration") {
        hasDefaultExport = true;
      }
    }

    return { hasAppContextType, hasContextConst, hasDefaultExport };
  } catch {
    return { hasAppContextType: false, hasContextConst: false, hasDefaultExport: false };
  }
}

export function findContextFile(
  config: ResolvedTaserConfig,
  cwd: string = process.cwd(),
): string | null {
  const candidates: string[] = [];

  if (config.contextFile) {
    candidates.push(resolve(cwd, config.contextFile));
  }

  const routesDirFull = resolve(cwd, config.routesDir);
  const srcDir = dirname(routesDirFull);

  candidates.push(
    resolve(cwd, "src", "context.ts"),
    resolve(cwd, "src", "context.tsx"),
    resolve(srcDir, "context.ts"),
    resolve(srcDir, "context.tsx"),
    resolve(cwd, "context.ts"),
    resolve(cwd, "context.tsx"),
  );

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function generateManifestCode(
  scanResult: ScanResult,
  config: ResolvedTaserConfig,
  cwd: string = process.cwd(),
): { manifestCode: string; dtsCode: string } {
  const quote = config.formatting.quotes === "single" ? "'" : '"';
  const outputDirFull = resolve(cwd, config.outputDir);

  // Group layouts by segment
  const layoutsBySegment = new Map<string, DiscoveredLayout>();
  for (const layout of scanResult.layouts) {
    layoutsBySegment.set(layout.targetSegment, layout);
  }

  const importLines: string[] = [];
  const layoutIdentifierMap = new Map<string, string>(); // layoutId -> identifier
  const routeIdentifierMap = new Map<DiscoveredRoute, string>();

  // 1. Generate layout imports
  scanResult.layouts.forEach((layout, idx) => {
    const ident = `layout_${idx}`;
    layoutIdentifierMap.set(layout.layoutId, ident);

    let relPath = posix.normalize(relative(outputDirFull, layout.absolutePath).replace(/\\/g, "/"));
    if (!relPath.startsWith("./") && !relPath.startsWith("../")) {
      relPath = `./${relPath}`;
    }

    importLines.push(`import ${ident} from ${quote}${relPath}${quote};`);
  });

  // 2. Generate route imports
  scanResult.routes.forEach((route, idx) => {
    const ident = `route_${idx}`;
    routeIdentifierMap.set(route, ident);

    let relPath = posix.normalize(relative(outputDirFull, route.absolutePath).replace(/\\/g, "/"));
    if (!relPath.startsWith("./") && !relPath.startsWith("../")) {
      relPath = `./${relPath}`;
    }

    importLines.push(`import ${ident} from ${quote}${relPath}${quote};`);
  });

  // 3. Build manifest layouts dictionary
  const layoutEntries: string[] = [];
  for (const layout of scanResult.layouts) {
    const ident = layoutIdentifierMap.get(layout.layoutId)!;
    layoutEntries.push(`    ${quote}${layout.layoutId}${quote}: ${ident},`);
  }

  // 4. Group routes by canonical path
  const routesByPath = new Map<string, DiscoveredRoute[]>();
  for (const route of scanResult.routes) {
    const list = routesByPath.get(route.canonicalPath) ?? [];
    list.push(route);
    routesByPath.set(route.canonicalPath, list);
  }

  const routeEntries: string[] = [];
  const routeByPathMethodEntries: string[] = [];

  for (const [canonicalPath, routes] of routesByPath.entries()) {
    const methodEntries: string[] = [];
    const dtsMethodEntries: string[] = [];

    for (const route of routes) {
      const ident = routeIdentifierMap.get(route)!;
      const inheritedLayouts = resolveLayoutsForRoute(route, layoutsBySegment);
      const layoutsStr = inheritedLayouts.map((lId) => `${quote}${lId}${quote}`).join(", ");

      methodEntries.push(`      ${route.method}: {
        layouts: [${layoutsStr}],
        route: ${ident},
      },`);

      dtsMethodEntries.push(`      ${route.method}: {
        layouts: readonly [${layoutsStr}];
      };`);
    }

    routeEntries.push(`    ${quote}${canonicalPath}${quote}: {
${methodEntries.join("\n")}
    },`);

    routeByPathMethodEntries.push(`    ${quote}${canonicalPath}${quote}: {
${dtsMethodEntries.join("\n")}
    };`);
  }

  const manifestImports = importLines.length > 0 ? `${importLines.join("\n")}\n\n` : "";

  const manifestCode = `/// <reference path="./routes.d.ts" />
// Generated by @taserjs/cli. Do not edit directly.
${manifestImports}export const layoutManifest = {
${layoutEntries.join("\n")}
} as const;

export const routeManifest = {
  layouts: layoutManifest,
  routes: {
${routeEntries.join("\n")}
  },
} as const;

export type LayoutManifest = typeof layoutManifest;
export type RouteManifest = typeof routeManifest;
`;

  // Build context type declaration
  const contextFile = findContextFile(config, cwd);
  let contextDeclaration: string;

  if (contextFile) {
    let contextRelPath = posix.normalize(relative(outputDirFull, contextFile).replace(/\\/g, "/"));
    if (!contextRelPath.startsWith("./") && !contextRelPath.startsWith("../")) {
      contextRelPath = `./${contextRelPath}`;
    }
    contextRelPath = contextRelPath.replace(/\.(ts|tsx)$/, ".js");

    const { hasAppContextType, hasContextConst, hasDefaultExport } =
      inspectContextExports(contextFile);

    if (hasAppContextType) {
      contextDeclaration = `export type AppContext = import(${quote}${contextRelPath}${quote}).AppContext;`;
    } else if (hasContextConst) {
      contextDeclaration = `export type AppContext = import("@taserjs/router").InferAppContext<typeof import(${quote}${contextRelPath}${quote}).context>;`;
    } else if (hasDefaultExport) {
      contextDeclaration = `export type AppContext = import("@taserjs/router").InferAppContext<typeof import(${quote}${contextRelPath}${quote}).default>;`;
    } else {
      contextDeclaration = `export type AppContext = Record<string, unknown>;`;
    }
  } else {
    contextDeclaration = `export type AppContext = Record<string, unknown>;`;
  }

  const uniquePaths = Array.from(new Set(scanResult.routes.map((r) => r.canonicalPath)));
  const routePathUnion = uniquePaths.length > 0
    ? uniquePaths.map((p) => `${quote}${p}${quote}`).join(" | ")
    : "string";

  const dtsCode = `// Generated by @taserjs/cli. Do not edit directly.
import type { LayoutManifest, RouteManifest } from "./routes.js";

export { routeManifest, layoutManifest } from "./routes.js";
export type { RouteManifest, LayoutManifest } from "./routes.js";

export type RoutePath = ${routePathUnion};

export type LayoutTree = LayoutManifest;

export type LayoutMiddlewares = {
  [K in keyof LayoutTree]: LayoutTree[K]["middlewares"];
};

export type RouteByPathMethod = {
${routeByPathMethodEntries.join("\n")}
};

${contextDeclaration}

declare module "@taserjs/router" {
  interface RouterRegister {
    RoutePath: RoutePath;
    LayoutTree: LayoutTree;
    LayoutMiddlewares: LayoutMiddlewares;
    RouteByPathMethod: RouteByPathMethod;
    AppContext: AppContext;
  }
}
`;

  return { manifestCode, dtsCode };
}

export function generateManifest(
  scanResult: ScanResult,
  config: ResolvedTaserConfig,
  cwd: string = process.cwd(),
): GenerateResult {
  if (scanResult.diagnostics.length > 0) {
    const errors = scanResult.diagnostics.map((d) => `  - ${d.filePath}: ${d.message}`).join("\n");
    throw new Error(
      `Build failed with ${scanResult.diagnostics.length} diagnostic error(s):\n${errors}`,
    );
  }

  const { manifestCode, dtsCode } = generateManifestCode(scanResult, config, cwd);

  const outputDirFull = resolve(cwd, config.outputDir);
  const manifestPath = resolve(outputDirFull, "routes.ts");
  const typesPath = resolve(outputDirFull, "routes.d.ts");

  const manifestWritten = safeWriteFile(manifestPath, manifestCode);
  const typesWritten = safeWriteFile(typesPath, dtsCode);

  return {
    manifestPath,
    typesPath,
    manifestWritten,
    typesWritten,
    content: manifestCode,
    typesContent: dtsCode,
  };
}

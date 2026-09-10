import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "pathe";
import {
  resolveAppFile,
  resolveImportExtension,
  resolveOutputDir,
  type ResolvedTaserConfig,
} from "./config.js";
import type { DiscoveredLayout, DiscoveredRoute, ScanResult } from "./scanner.js";

export interface GenerateResult {
  manifestPath: string;
  manifestWritten: boolean;
  content: string;
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

export function resolveParentLayoutsForLayout(
  layout: DiscoveredLayout,
  layoutsBySegment: Map<string, DiscoveredLayout>,
): string[] {
  if (layout.targetSegment === "" || layout.targetSegment === "$") {
    return [];
  }

  const parts = layout.targetSegment.split("/");
  const parentLayoutIds: string[] = [];

  const rootLayout = layoutsBySegment.get("") ?? layoutsBySegment.get("$");
  if (rootLayout && rootLayout.layoutId !== layout.layoutId) {
    parentLayoutIds.push(rootLayout.layoutId);
  }

  let currentSegment = "";
  for (let i = 0; i < parts.length - 1; i++) {
    currentSegment = currentSegment ? `${currentSegment}/${parts[i]}` : parts[i]!;
    const parentLayout = layoutsBySegment.get(currentSegment);
    if (
      parentLayout &&
      parentLayout.layoutId !== layout.layoutId &&
      !parentLayoutIds.includes(parentLayout.layoutId)
    ) {
      parentLayoutIds.push(parentLayout.layoutId);
    }
  }

  return parentLayoutIds;
}

export function generateManifestCode(
  scanResult: ScanResult,
  config: ResolvedTaserConfig,
  cwd: string = process.cwd(),
): { manifestCode: string } {
  const quote = config.formatting.quotes === "single" ? "'" : '"';
  const ext = resolveImportExtension(config.extension);
  const outputDirFull = resolveOutputDir(config, cwd);
  const appFile = resolveAppFile(config, cwd);
  const hasApp = existsSync(appFile);

  let appRelPath = "";
  if (hasApp) {
    let rel = relative(outputDirFull, appFile);
    if (!rel.startsWith("./") && !rel.startsWith("../")) {
      rel = `./${rel}`;
    }
    appRelPath = rel.replace(/\.(ts|tsx|mts|cts|js|mjs|cjs)$/, "") + ext;
  }

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

    let relPath = relative(outputDirFull, layout.absolutePath);
    if (!relPath.startsWith("./") && !relPath.startsWith("../")) {
      relPath = `./${relPath}`;
    }
    relPath = relPath.replace(/\.(ts|tsx|mts|cts|js|mjs|cjs)$/, "") + ext;

    importLines.push(`import ${ident} from ${quote}${relPath}${quote};`);
  });

  // 2. Generate route imports
  scanResult.routes.forEach((route, idx) => {
    const ident = `route_${idx}`;
    routeIdentifierMap.set(route, ident);

    let relPath = relative(outputDirFull, route.absolutePath);
    if (!relPath.startsWith("./") && !relPath.startsWith("../")) {
      relPath = `./${relPath}`;
    }
    relPath = relPath.replace(/\.(ts|tsx|mts|cts|js|mjs|cjs)$/, "") + ext;

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

  const appImport = hasApp ? `import taser from ${quote}${appRelPath}${quote};\n` : "";

  const appCompilation = hasApp
    ? `export const app = createTaserApp(routeManifest, taser);
export default app;
export const createApp = (overrideTaser?: typeof taser) =>
  createTaserApp(routeManifest, overrideTaser ?? taser);`
    : `export const app = createTaserApp(routeManifest);
export default app;
export const createApp = (overrideTaser?: TaserDefinition) =>
  createTaserApp(routeManifest, overrideTaser);`;

  const runtimeImports = hasApp
    ? `import { createTaserApp } from "@taserjs/runtime";`
    : `import { createTaserApp, type TaserDefinition } from "@taserjs/runtime";`;

  // Build context type declaration without AST parsing
  const contextDeclaration = hasApp
    ? `export type AppContext = typeof taser.$Infer.Context;`
    : `export type AppContext = Record<string, unknown>;`;

  const uniquePaths = Array.from(new Set(scanResult.routes.map((r) => r.canonicalPath)));
  const routePathUnion =
    uniquePaths.length > 0 ? uniquePaths.map((p) => `${quote}${p}${quote}`).join(" | ") : "string";

  const layoutHierarchyEntries: string[] = [];
  const layoutTreeEntries: string[] = [];
  for (let i = 0; i < scanResult.layouts.length; i++) {
    const layout = scanResult.layouts[i]!;
    const parentLayoutIds = resolveParentLayoutsForLayout(layout, layoutsBySegment);
    const parentsStr = parentLayoutIds.map((lId) => `${quote}${lId}${quote}`).join(", ");
    layoutHierarchyEntries.push(`  ${quote}${layout.layoutId}${quote}: readonly [${parentsStr}];`);
    layoutTreeEntries.push(`  ${quote}${layout.layoutId}${quote}: typeof layout_${i};`);
  }

  const manifestCode = `// Generated by @taserjs/cli. Do not edit directly.
${runtimeImports}
${appImport}${manifestImports}export type LayoutTree = {
${layoutTreeEntries.join("\n")}
};

export const layoutManifest = {
${layoutEntries.join("\n")}
} as const;

export const routeManifest = {
  layouts: layoutManifest,
  routes: {
${routeEntries.join("\n")}
  },
} as const;

export type RouteManifest = typeof routeManifest;

${appCompilation}

export type RoutePath = ${routePathUnion};

export type LayoutHierarchy = {
${layoutHierarchyEntries.join("\n")}
};

export type RouteByPathMethod = {
${routeByPathMethodEntries.join("\n")}
};

${contextDeclaration}

declare module "@taserjs/router" {
  interface RouterRegister {
    RoutePath: RoutePath;
    LayoutTree: LayoutTree;
    LayoutHierarchy: LayoutHierarchy;
    RouteByPathMethod: RouteByPathMethod;
    AppContext: AppContext;
  }
}
`;

  return { manifestCode };
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

  const { manifestCode } = generateManifestCode(scanResult, config, cwd);

  const outputDirFull = resolveOutputDir(config, cwd);
  const manifestPath = resolve(outputDirFull, "routes.gen.ts");

  const manifestWritten = safeWriteFile(manifestPath, manifestCode);

  return {
    manifestPath,
    manifestWritten,
    content: manifestCode,
  };
}

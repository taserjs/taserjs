import type { TSESTree } from "@typescript-eslint/types";

import type { LayoutFile, RouteEntry } from "../types/index.js";
import { importDeclaration } from "./ast/builders.js";

type ImportRewrite = ((spec: string) => string) | undefined;

export function buildLayoutImportDeclarations(
  layouts: LayoutFile[],
  rewriteImportPath: ImportRewrite = undefined,
): TSESTree.ImportDeclaration[] {
  return layouts.map((layout) =>
    importDeclaration(layout.importName, "Middleware", apply(layout.importPath, rewriteImportPath)),
  );
}

export function buildRouteImportDeclarations(
  routes: RouteEntry[],
  rewriteImportPath: ImportRewrite = undefined,
): TSESTree.ImportDeclaration[] {
  return routes.map((route) =>
    importDeclaration(route.importName, "Route", apply(route.importPath, rewriteImportPath)),
  );
}

function apply(spec: string, rewrite: ImportRewrite): string {
  return rewrite ? rewrite(spec) : spec;
}

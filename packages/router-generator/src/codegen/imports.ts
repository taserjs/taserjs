import type { TSESTree } from "@typescript-eslint/types";

import type { LayoutFile, RouteEntry } from "../types/index.js";
import { importDeclaration } from "./ast/builders.js";

export function buildLayoutImportDeclarations(layouts: LayoutFile[]): TSESTree.ImportDeclaration[] {
  return layouts.map((layout) =>
    importDeclaration(layout.importName, "Middleware", layout.importPath),
  );
}

export function buildRouteImportDeclarations(routes: RouteEntry[]): TSESTree.ImportDeclaration[] {
  return routes.map((route) => importDeclaration(route.importName, "Route", route.importPath));
}

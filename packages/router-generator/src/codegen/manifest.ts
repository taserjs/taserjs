import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/types";

import type { GeneratedModel, LayoutFile, RouteEntry } from "../types.js";
import {
  arrayExpression,
  exportConst,
  id,
  importDefaultDeclaration,
  objectExpression,
  objectProperty,
  str,
} from "./builders.js";
import { asNode } from "./ast.js";

export type EmitManifestOptions = {
  quotes?: "single" | "double" | undefined;
  header?: readonly string[] | undefined;
  rewriteImportPath?: ((spec: string) => string) | undefined;
  taserImportPath?: string | undefined;
};

export function joinManifestSections(
  header?: readonly string[] | undefined,
  body?: string | undefined,
): string {
  const sections = [...(header ?? []), body ?? ""].filter((section) => section.length > 0);
  return `${sections.join("\n")}\n`;
}

function applyRewrite(spec: string, rewrite?: (spec: string) => string): string {
  return rewrite ? rewrite(spec) : spec;
}

export function buildLayoutImports(
  layouts: LayoutFile[],
  rewriteImportPath?: (spec: string) => string,
): TSESTree.ImportDeclaration[] {
  return layouts.map((layout) =>
    importDefaultDeclaration(layout.importName, applyRewrite(layout.importPath, rewriteImportPath)),
  );
}

export function buildRouteImports(
  routes: RouteEntry[],
  rewriteImportPath?: (spec: string) => string,
): TSESTree.ImportDeclaration[] {
  return routes.map((route) =>
    importDefaultDeclaration(route.importName, applyRewrite(route.importPath, rewriteImportPath)),
  );
}

export function buildManifestLayoutsObject(model: GeneratedModel): TSESTree.ObjectExpression {
  const layoutById = new Map(model.layouts.map((layout) => [layout.id, layout]));
  const properties: TSESTree.PropertyNonComputedName[] = [];

  for (const layoutId of model.layoutIds) {
    const layout = layoutById.get(layoutId);
    if (!layout) {
      throw new Error(`Missing layout for ${layoutId}`);
    }

    properties.push(objectProperty(str(layoutId), id(layout.importName)));
  }

  return objectExpression(properties);
}

export function buildManifestRoutesObject(model: GeneratedModel): TSESTree.ObjectExpression {
  const properties: TSESTree.PropertyNonComputedName[] = [];
  const routeByRel = new Map(model.routes.map((route) => [route.routeRel, route]));

  for (const [urlPath, entries] of model.routesByPath) {
    const methodProperties: TSESTree.PropertyNonComputedName[] = [];

    for (const entry of entries) {
      const fullRoute = routeByRel.get(entry.routeRel);
      if (!fullRoute) continue;

      methodProperties.push(
        objectProperty(
          id(entry.method),
          objectExpression([
            objectProperty(
              id("layouts"),
              arrayExpression(
                (entry.layouts ?? fullRoute.layouts).map((layoutId) => str(layoutId)),
              ),
            ),
            objectProperty(id("route"), id(fullRoute.importName)),
          ]),
        ),
      );
    }

    properties.push(objectProperty(str(urlPath), objectExpression(methodProperties)));
  }

  return objectExpression(properties);
}

export function buildVirtualManifestProgram(
  model: GeneratedModel,
  rewriteImportPath?: EmitManifestOptions["rewriteImportPath"],
): TSESTree.Program {
  const body: TSESTree.Statement[] = [
    ...buildLayoutImports(model.layouts, rewriteImportPath),
    ...buildRouteImports(model.routes, rewriteImportPath),
    exportConst(
      "routeManifest",
      objectExpression([
        objectProperty(id("layouts"), buildManifestLayoutsObject(model)),
        objectProperty(id("routes"), buildManifestRoutesObject(model)),
      ]),
    ),
  ];

  return asNode<TSESTree.Program>({
    type: AST_NODE_TYPES.Program,
    body,
    sourceType: "module",
    comments: undefined,
    tokens: undefined,
  });
}

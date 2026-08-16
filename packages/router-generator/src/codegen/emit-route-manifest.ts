import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/types";
import { print } from "esrap";
import ts from "esrap/languages/ts";

import type { GeneratedModel } from "../types/index.js";
import type { EmitManifestOptions } from "./format-manifest.js";
import { joinManifestSections, formatManifestSource } from "./format-manifest.js";
import type { FormatCache } from "./format-cache.js";

type NodeFields = "parent" | "loc" | "range";

function asNode<T extends TSESTree.Node>(node: Omit<T, NodeFields>): T {
  return node as T;
}
import {
  arrayExpression,
  exportConst,
  exportTypeAlias,
  id,
  objectExpression,
  objectProperty,
  str,
  tsAsConst,
  tsLiteralType,
  tsTypeAlias,
  tsTypeQuery,
  tsUnionType,
} from "./ast/builders.js";
import { buildLayoutImportDeclarations, buildRouteImportDeclarations } from "./imports.js";
import { buildLayoutTreeType, buildRouterRegisterAugmentation } from "./layout-tree-type.js";
import { buildRouteByPathMethodType } from "./route-by-path-method-type.js";

function buildManifestLayoutsObject(model: GeneratedModel): TSESTree.ObjectExpression {
  const layoutById = new Map(model.layouts.map((layout) => [layout.id, layout]));
  const properties: TSESTree.PropertyNonComputedName[] = [];

  for (const layoutId of model.layoutIds) {
    const layout = layoutById.get(layoutId);
    if (!layout) {
      throw new Error(`Missing layout for ${layoutId}`);
    }

    properties.push(
      objectProperty(
        str(layoutId),
        objectExpression([objectProperty(id("middlewares"), id(layout.importName))]),
      ),
    );
  }

  return objectExpression(properties);
}

function buildManifestRoutesObject(model: GeneratedModel): TSESTree.ObjectExpression {
  const properties: TSESTree.PropertyNonComputedName[] = [];
  const sortedPaths = [...model.routesByPath.keys()].sort();

  for (const urlPath of sortedPaths) {
    const entries = model.routesByPath.get(urlPath) ?? [];
    const methodProperties: TSESTree.PropertyNonComputedName[] = [];

    for (const entry of [...entries].sort((left, right) =>
      left.method.localeCompare(right.method),
    )) {
      const fullRoute = model.routes.find((route) => route.routeRel === entry.routeRel);
      if (!fullRoute) {
        continue;
      }

      methodProperties.push(
        objectProperty(
          id(entry.method),
          objectExpression([
            objectProperty(
              id("layoutChain"),
              arrayExpression(
                (entry.layoutChain ?? fullRoute.layoutChain).map((layoutId) => str(layoutId)),
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

function buildProgram(model: GeneratedModel): TSESTree.Program {
  const routePathType = tsTypeAlias(
    "RoutePathGen",
    tsUnionType(model.routePaths.map((path) => tsLiteralType(path))),
  );

  const layoutIdType = tsTypeAlias(
    "LayoutIdGen",
    tsUnionType(model.layoutIds.map((idValue) => tsLiteralType(idValue))),
  );

  const layoutTreeType = buildLayoutTreeType(model.layoutIds, model.layoutParents, model.layouts);

  const routeByPathMethodType = buildRouteByPathMethodType(model.routesByPath);

  const body: TSESTree.Statement[] = [
    ...buildLayoutImportDeclarations(model.layouts),
    ...buildRouteImportDeclarations(model.routes),
    exportConst(
      "routeManifest",
      tsAsConst(
        objectExpression([
          objectProperty(id("layouts"), buildManifestLayoutsObject(model)),
          objectProperty(id("routes"), buildManifestRoutesObject(model)),
        ]),
      ),
    ),
    routePathType,
    layoutIdType,
    layoutTreeType,
    routeByPathMethodType,
    buildRouterRegisterAugmentation(),
    exportTypeAlias("RouteManifest", tsTypeQuery("routeManifest")),
  ];

  return asNode<TSESTree.Program>({
    type: AST_NODE_TYPES.Program,
    body,
    sourceType: "module",
    comments: undefined,
    tokens: undefined,
  });
}

function printProgram(program: TSESTree.Program, quotes: "single" | "double"): string {
  const { code } = print(program, ts({ quotes }));
  return code;
}

export function emitRouteManifestSource(
  model: GeneratedModel,
  options: EmitManifestOptions,
): string {
  const program = buildProgram(model);
  const body = printProgram(program, options.quotes);
  return joinManifestSections(options.header, body, options.footer);
}

export async function emitFormattedRouteManifestSource(
  model: GeneratedModel,
  options: EmitManifestOptions,
  formatCache?: FormatCache,
): Promise<string> {
  const source = emitRouteManifestSource(model, options);
  return formatManifestSource(source, options, formatCache);
}

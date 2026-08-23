import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/types";
import { print } from "esrap";
import ts from "esrap/languages/ts";

import type { GeneratedModel } from "../types/index.js";
import { joinManifestSections, type EmitManifestOptions } from "./format-manifest.js";

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
import { buildClientChainType } from "./client-chain-type.js";

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
  // Invariant: model.routesByPath insertion order is urlPath-sorted and each
  // value array is method-sorted (assembleGeneratedModel derives both from the
  // finalized, sorted route list) — no per-emit sorting needed.
  const routeByRel = new Map(model.routes.map((route) => [route.routeRel, route]));

  for (const [urlPath, entries] of model.routesByPath) {
    const methodProperties: TSESTree.PropertyNonComputedName[] = [];

    for (const entry of entries) {
      const fullRoute = routeByRel.get(entry.routeRel);
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

  const clientChainType = buildClientChainType(model.routesByPath);

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
    clientChainType,
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

function buildVirtualManifestProgram(model: GeneratedModel): TSESTree.Program {
  const body: TSESTree.Statement[] = [
    ...buildLayoutImportDeclarations(model.layouts),
    ...buildRouteImportDeclarations(model.routes),
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

function buildTypeDeclarationsProgram(model: GeneratedModel): TSESTree.Program {
  return buildProgram(model);
}

function printProgram(program: TSESTree.Program, quotes: "single" | "double"): string {
  const { code } = print(program, ts({ quotes }));
  return code;
}

export function emitVirtualManifestSource(
  model: GeneratedModel,
  options: Partial<EmitManifestOptions> = {},
): string {
  const program = buildVirtualManifestProgram(model);
  const body = printProgram(program, options.quotes ?? "double");
  return joinManifestSections(options.header ?? [], body, options.footer ?? []);
}

export function emitTypeDeclarationsSource(
  model: GeneratedModel,
  options: Partial<EmitManifestOptions> = {},
): string {
  const program = buildTypeDeclarationsProgram(model);
  const body = printProgram(program, options.quotes ?? "double");
  return joinManifestSections(options.header, body, options.footer);
}

export function emitRouteManifestSource(
  model: GeneratedModel,
  options: EmitManifestOptions = {},
): string {
  const program = buildProgram(model);
  const body = printProgram(program, options.quotes ?? "single");
  return joinManifestSections(options.header, body, options.footer);
}

import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/types";

import type { GeneratedModel, LayoutFile } from "../types.js";
import {
  exportConst,
  exportTypeAlias,
  id,
  importDefaultDeclaration,
  objectExpression,
  objectProperty,
  str,
  tsAsConst,
  tsConditionalType,
  tsInferType,
  tsLiteralType,
  tsNullKeyword,
  tsPropertySignature,
  tsTupleType,
  tsTypeAlias,
  tsTypeLiteral,
  tsTypeQuery,
  tsTypeReference,
  tsUnionType,
} from "./builders.js";
import {
  buildLayoutImports,
  buildManifestLayoutsObject,
  buildManifestRoutesObject,
  buildRouteImports,
  type EmitManifestOptions,
} from "./manifest.js";
import { asNode } from "./ast.js";

export function buildLayoutTreeType(
  layoutIds: string[],
  layoutParents: Map<string, string | null>,
  layouts: LayoutFile[],
): TSESTree.TSTypeAliasDeclaration {
  const layoutById = new Map(layouts.map((layout) => [layout.id, layout]));

  const properties: TSESTree.TypeElement[] = layoutIds.map((layoutId) => {
    const layout = layoutById.get(layoutId);
    if (!layout) {
      throw new Error(`Missing layout import for ${layoutId}`);
    }

    const parent = layoutParents.get(layoutId) ?? null;
    const parentType = parent === null ? tsNullKeyword() : tsLiteralType(parent);

    return tsPropertySignature(
      str(layoutId),
      tsTypeLiteral([
        tsPropertySignature(id("parent"), parentType),
        tsPropertySignature(id("middlewares"), tsTypeQuery(layout.importName)),
      ]),
    );
  });

  return tsTypeAlias("LayoutTreeGen", tsTypeLiteral(properties));
}

export function buildRouteByPathMethodType(
  routesByPath: GeneratedModel["routesByPath"],
): TSESTree.TSTypeAliasDeclaration {
  const properties: TSESTree.TypeElement[] = [];

  for (const [urlPath, entries] of routesByPath) {
    const methodProperties: TSESTree.TypeElement[] = [];

    for (const entry of entries) {
      const parentType =
        entry.parentLayout === null ? tsNullKeyword() : tsLiteralType(entry.parentLayout);

      const layoutChainType = tsTupleType(
        entry.layoutChain.map((layoutId) => tsLiteralType(layoutId)),
      );

      methodProperties.push(
        tsPropertySignature(
          id(entry.method),
          tsTypeLiteral([
            tsPropertySignature(id("parent"), parentType),
            tsPropertySignature(id("layoutChain"), layoutChainType),
            tsPropertySignature(id("route"), tsTypeQuery(entry.importName)),
          ]),
        ),
      );
    }

    properties.push(tsPropertySignature(str(urlPath), tsTypeLiteral(methodProperties)));
  }

  return tsTypeAlias("RouteByPathMethodGen", tsTypeLiteral(properties));
}

export function buildAppContextType(): TSESTree.TSTypeAliasDeclaration {
  return tsTypeAlias(
    "AppContextGen",
    tsConditionalType(
      tsTypeQuery("taser"),
      tsTypeLiteral([
        tsPropertySignature(
          id("$Infer"),
          tsTypeLiteral([tsPropertySignature(id("Context"), tsInferType("C"))]),
        ),
      ]),
      tsTypeReference("C"),
      tsTypeLiteral([]),
    ),
  );
}

export function buildLayoutParentsType(
  layoutIds: string[],
  layoutParents: Map<string, string | null>,
): TSESTree.TSTypeAliasDeclaration {
  const properties: TSESTree.TypeElement[] = layoutIds.map((layoutId) => {
    const parent = layoutParents.get(layoutId) ?? null;
    const parentType = parent === null ? tsNullKeyword() : tsLiteralType(parent);
    return tsPropertySignature(str(layoutId), parentType);
  });

  return tsTypeAlias("LayoutParentsGen", tsTypeLiteral(properties));
}

export function buildRouterRegisterAugmentation(
  hasAppContext: boolean = false,
): TSESTree.TSModuleDeclarationModuleWithStringIdDeclared {
  const registerMembers: TSESTree.TypeElement[] = [];

  if (hasAppContext) {
    registerMembers.push(tsPropertySignature(id("AppContext"), tsTypeReference("AppContextGen")));
  }

  registerMembers.push(
    tsPropertySignature(id("RoutePath"), tsTypeReference("RoutePathGen")),
    tsPropertySignature(id("LayoutId"), tsTypeReference("LayoutIdGen")),
    tsPropertySignature(id("LayoutParents"), tsTypeReference("LayoutParentsGen")),
    tsPropertySignature(id("LayoutTree"), tsTypeReference("LayoutTreeGen")),
    tsPropertySignature(id("RouteByPathMethod"), tsTypeReference("RouteByPathMethodGen")),
  );

  return asNode<TSESTree.TSModuleDeclarationModuleWithStringIdDeclared>({
    type: AST_NODE_TYPES.TSModuleDeclaration,
    declare: true,
    kind: "module",
    global: false,
    id: str("@taserjs/router"),
    body: asNode<TSESTree.TSModuleBlock>({
      type: AST_NODE_TYPES.TSModuleBlock,
      body: [
        asNode<TSESTree.TSInterfaceDeclaration>({
          type: AST_NODE_TYPES.TSInterfaceDeclaration,
          declare: false,
          id: id("RouterRegister"),
          typeParameters: undefined,
          extends: [],
          body: asNode<TSESTree.TSInterfaceBody>({
            type: AST_NODE_TYPES.TSInterfaceBody,
            body: registerMembers,
          }),
        }),
      ],
    }),
  });
}

export function buildFullProgram(
  model: GeneratedModel,
  options?: EmitManifestOptions,
): TSESTree.Program {
  const rewriteImportPath = options?.rewriteImportPath;
  const taserImportPath = options?.taserImportPath;

  const routePathType = tsTypeAlias(
    "RoutePathGen",
    tsUnionType(model.routePaths.map((path) => tsLiteralType(path))),
  );

  const layoutIdType = tsTypeAlias(
    "LayoutIdGen",
    tsUnionType(model.layoutIds.map((idValue) => tsLiteralType(idValue))),
  );

  const layoutParentsType = buildLayoutParentsType(model.layoutIds, model.layoutParents);
  const layoutTreeType = buildLayoutTreeType(model.layoutIds, model.layoutParents, model.layouts);
  const routeByPathMethodType = buildRouteByPathMethodType(model.routesByPath);

  const imports: TSESTree.Statement[] = [];

  if (taserImportPath) {
    imports.push(importDefaultDeclaration("taser", taserImportPath, "type"));
  }

  imports.push(
    ...buildLayoutImports(model.layouts, rewriteImportPath),
    ...buildRouteImports(model.routes, rewriteImportPath),
  );

  const body: TSESTree.Statement[] = [
    ...imports,
    exportConst(
      "routeManifest",
      tsAsConst(
        objectExpression([
          objectProperty(id("layouts"), buildManifestLayoutsObject(model)),
          objectProperty(id("routes"), buildManifestRoutesObject(model)),
        ]),
      ),
    ),
    ...(taserImportPath ? [buildAppContextType()] : []),
    routePathType,
    layoutIdType,
    layoutParentsType,
    layoutTreeType,
    routeByPathMethodType,
    buildRouterRegisterAugmentation(Boolean(taserImportPath)),
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

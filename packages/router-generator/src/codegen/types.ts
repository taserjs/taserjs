import { CLIENT_METHOD_MAP } from "@taserjs/router-utils/http";
import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/types";

import type { GeneratedModel, HttpVerb, LayoutFile } from "../types.js";
import {
  exportConst,
  exportTypeAlias,
  id,
  objectExpression,
  objectProperty,
  str,
  tsAsConst,
  tsIndexedAccessType,
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

interface ChainNode {
  methods: Map<string, { urlPath: string; method: HttpVerb }>;
  children: Map<string, ChainNode>;
}

function createChainNode(): ChainNode {
  return {
    methods: new Map(),
    children: new Map(),
  };
}

function segmentToKey(segment: string): string {
  if (segment === "*") return "_splat";
  if (segment.startsWith(":")) return `_${segment.slice(1)}`;
  if (segment.startsWith(".")) {
    return `$${segment.slice(1).replaceAll("-", "_")}`;
  }
  return segment.replaceAll("-", "_");
}

function urlPathToSegments(urlPath: string): string[] {
  if (urlPath === "/" || urlPath === "") {
    return [];
  }
  const parts = urlPath.split("/").filter((s) => s.length > 0);
  return parts.map(segmentToKey);
}

function propertyKey(name: string): TSESTree.PropertyNameNonComputed {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) ? id(name) : str(name);
}

function buildNodeMembers(node: ChainNode): TSESTree.TypeElement[] {
  const members: TSESTree.TypeElement[] = [];

  const sortedMethods = [...node.methods.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [clientMethodKey, { urlPath, method }] of sortedMethods) {
    const indexedType = tsIndexedAccessType(
      tsIndexedAccessType(tsTypeReference("RouteByPathMethodGen"), tsLiteralType(urlPath)),
      tsLiteralType(method),
    );
    members.push(tsPropertySignature(propertyKey(clientMethodKey), indexedType));
  }

  const sortedChildren = [...node.children.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [childKey, childNode] of sortedChildren) {
    const childMembers = buildNodeMembers(childNode);
    members.push(tsPropertySignature(propertyKey(childKey), tsTypeLiteral(childMembers)));
  }

  return members;
}

export function buildClientChainType(
  routesByPath: GeneratedModel["routesByPath"],
): TSESTree.TSTypeAliasDeclaration {
  const root = createChainNode();

  for (const [urlPath, entries] of routesByPath) {
    const segments = urlPathToSegments(urlPath);
    let current = root;
    for (const segment of segments) {
      let child = current.children.get(segment);
      if (!child) {
        child = createChainNode();
        current.children.set(segment, child);
      }
      current = child;
    }

    for (const entry of entries) {
      const clientKey = CLIENT_METHOD_MAP[entry.method];
      if (clientKey) {
        current.methods.set(clientKey, { urlPath, method: entry.method });
      }
    }
  }

  const members = buildNodeMembers(root);
  return tsTypeAlias("ClientChainGen", tsTypeLiteral(members));
}

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

export function buildRouterRegisterAugmentation(): TSESTree.TSModuleDeclarationModuleWithStringIdDeclared {
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
            body: [
              tsPropertySignature(id("RoutePath"), tsTypeReference("RoutePathGen")),
              tsPropertySignature(id("LayoutId"), tsTypeReference("LayoutIdGen")),
              tsPropertySignature(id("LayoutTree"), tsTypeReference("LayoutTreeGen")),
              tsPropertySignature(id("RouteByPathMethod"), tsTypeReference("RouteByPathMethodGen")),
              tsPropertySignature(id("ClientChain"), tsTypeReference("ClientChainGen")),
            ],
          }),
        }),
      ],
    }),
  });
}

export function buildFullProgram(
  model: GeneratedModel,
  rewriteImportPath?: EmitManifestOptions["rewriteImportPath"],
): TSESTree.Program {
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
    ...buildLayoutImports(model.layouts, rewriteImportPath),
    ...buildRouteImports(model.routes, rewriteImportPath),
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

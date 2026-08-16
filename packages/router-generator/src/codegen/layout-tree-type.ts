import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/types";

import type { LayoutFile } from "../types/index.js";
import {
  id,
  str,
  tsLiteralType,
  tsNullKeyword,
  tsPropertySignature,
  tsTypeAlias,
  tsTypeLiteral,
  tsTypeQuery,
  tsTypeReference,
} from "./ast/builders.js";

type NodeFields = "parent" | "loc" | "range";

function asNode<T extends TSESTree.Node>(node: Omit<T, NodeFields>): T {
  return node as T;
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
            ],
          }),
        }),
      ],
    }),
  });
}

import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/types";

import { asNode } from "./ast.js";

export function id(name: string): TSESTree.Identifier {
  return asNode<TSESTree.Identifier>({
    type: AST_NODE_TYPES.Identifier,
    name,
    decorators: [],
    optional: false,
    typeAnnotation: undefined,
  });
}

export function str(value: string): TSESTree.StringLiteral {
  return asNode<TSESTree.StringLiteral>({
    type: AST_NODE_TYPES.Literal,
    value,
    raw: JSON.stringify(value),
  });
}

export function tsLiteralType(value: string): TSESTree.TSLiteralType {
  return asNode<TSESTree.TSLiteralType>({
    type: AST_NODE_TYPES.TSLiteralType,
    literal: str(value),
  });
}

export function tsTypeReference(name: string): TSESTree.TSTypeReference {
  return asNode<TSESTree.TSTypeReference>({
    type: AST_NODE_TYPES.TSTypeReference,
    typeName: id(name),
    typeArguments: undefined,
  });
}

export function tsIndexedAccessType(
  objectType: TSESTree.TypeNode,
  indexType: TSESTree.TypeNode,
): TSESTree.TSIndexedAccessType {
  return asNode<TSESTree.TSIndexedAccessType>({
    type: AST_NODE_TYPES.TSIndexedAccessType,
    objectType,
    indexType,
  });
}

export function tsUnionType(members: TSESTree.TypeNode[]): TSESTree.TypeNode {
  if (members.length === 0) {
    return asNode<TSESTree.TSNeverKeyword>({ type: AST_NODE_TYPES.TSNeverKeyword });
  }
  if (members.length === 1) {
    return members[0]!;
  }
  return asNode<TSESTree.TSUnionType>({
    type: AST_NODE_TYPES.TSUnionType,
    types: members,
  });
}

export function tsTypeAnnotation(type: TSESTree.TypeNode): TSESTree.TSTypeAnnotation {
  return asNode<TSESTree.TSTypeAnnotation>({
    type: AST_NODE_TYPES.TSTypeAnnotation,
    typeAnnotation: type,
  });
}

export function tsPropertySignature(
  key: TSESTree.PropertyNameNonComputed,
  type: TSESTree.TypeNode,
): TSESTree.TSPropertySignatureNonComputedName {
  return asNode<TSESTree.TSPropertySignatureNonComputedName>({
    type: AST_NODE_TYPES.TSPropertySignature,
    computed: false,
    key,
    optional: false,
    readonly: false,
    static: false,
    accessibility: undefined,
    typeAnnotation: tsTypeAnnotation(type),
  });
}

export function tsTypeLiteral(members: TSESTree.TypeElement[]): TSESTree.TSTypeLiteral {
  return asNode<TSESTree.TSTypeLiteral>({
    type: AST_NODE_TYPES.TSTypeLiteral,
    members,
  });
}

export function tsTypeAlias(
  name: string,
  type: TSESTree.TypeNode,
): TSESTree.TSTypeAliasDeclaration {
  return asNode<TSESTree.TSTypeAliasDeclaration>({
    type: AST_NODE_TYPES.TSTypeAliasDeclaration,
    declare: false,
    id: id(name),
    typeParameters: undefined,
    typeAnnotation: type,
  });
}

export function tsTypeQuery(name: string): TSESTree.TSTypeQuery {
  return asNode<TSESTree.TSTypeQuery>({
    type: AST_NODE_TYPES.TSTypeQuery,
    exprName: id(name),
    typeArguments: undefined,
  });
}

export function tsNullKeyword(): TSESTree.TSNullKeyword {
  return asNode<TSESTree.TSNullKeyword>({ type: AST_NODE_TYPES.TSNullKeyword });
}

export function tsTupleType(elements: TSESTree.TypeNode[]): TSESTree.TSTupleType {
  return asNode<TSESTree.TSTupleType>({
    type: AST_NODE_TYPES.TSTupleType,
    elementTypes: elements,
  });
}

export function tsConditionalType(
  checkType: TSESTree.TypeNode,
  extendsType: TSESTree.TypeNode,
  trueType: TSESTree.TypeNode,
  falseType: TSESTree.TypeNode,
): TSESTree.TSConditionalType {
  return asNode<TSESTree.TSConditionalType>({
    type: AST_NODE_TYPES.TSConditionalType,
    checkType,
    extendsType,
    trueType,
    falseType,
  });
}

export function tsInferType(typeParameterName: string): TSESTree.TSInferType {
  return asNode<TSESTree.TSInferType>({
    type: AST_NODE_TYPES.TSInferType,
    typeParameter: asNode<TSESTree.TSTypeParameter>({
      type: AST_NODE_TYPES.TSTypeParameter,
      name: id(typeParameterName),
      in: false,
      out: false,
      const: false,
      default: undefined,
      constraint: undefined,
    }),
  });
}

export function objectProperty(
  key: TSESTree.PropertyNameNonComputed,
  value: TSESTree.Expression,
): TSESTree.PropertyNonComputedName {
  return asNode<TSESTree.PropertyNonComputedName>({
    type: AST_NODE_TYPES.Property,
    key,
    value,
    kind: "init",
    method: false,
    shorthand: false,
    computed: false,
    optional: false,
  });
}

export function objectExpression(
  properties: TSESTree.PropertyNonComputedName[],
): TSESTree.ObjectExpression {
  return asNode<TSESTree.ObjectExpression>({
    type: AST_NODE_TYPES.ObjectExpression,
    properties,
  });
}

export function arrayExpression(elements: TSESTree.Expression[]): TSESTree.ArrayExpression {
  return asNode<TSESTree.ArrayExpression>({
    type: AST_NODE_TYPES.ArrayExpression,
    elements,
  });
}

export function importDeclaration(
  local: string,
  imported: string,
  source: string,
  importKind: "type" | "value" = "value",
): TSESTree.ImportDeclaration {
  return asNode<TSESTree.ImportDeclaration>({
    type: AST_NODE_TYPES.ImportDeclaration,
    specifiers: [
      asNode<TSESTree.ImportSpecifier>({
        type: AST_NODE_TYPES.ImportSpecifier,
        imported: id(imported),
        local: id(local),
        importKind: "value",
      }),
    ],
    source: str(source),
    importKind,
    assertions: [],
    attributes: [],
    phase: null,
  });
}

export function importDefaultDeclaration(
  local: string,
  source: string,
  importKind: "type" | "value" = "value",
): TSESTree.ImportDeclaration {
  return asNode<TSESTree.ImportDeclaration>({
    type: AST_NODE_TYPES.ImportDeclaration,
    specifiers: [
      asNode<TSESTree.ImportDefaultSpecifier>({
        type: AST_NODE_TYPES.ImportDefaultSpecifier,
        local: id(local),
      }),
    ],
    source: str(source),
    importKind,
    assertions: [],
    attributes: [],
    phase: null,
  });
}

export function exportConst(
  name: string,
  init: TSESTree.Expression,
): TSESTree.ExportNamedDeclarationWithoutSourceWithSingle {
  return asNode<TSESTree.ExportNamedDeclarationWithoutSourceWithSingle>({
    type: AST_NODE_TYPES.ExportNamedDeclaration,
    declaration: asNode<TSESTree.ConstDeclaration>({
      type: AST_NODE_TYPES.VariableDeclaration,
      kind: "const",
      declare: false,
      declarations: [
        asNode<TSESTree.VariableDeclaratorMaybeInit>({
          type: AST_NODE_TYPES.VariableDeclarator,
          id: id(name),
          init,
          definite: false,
        }),
      ],
    }),
    specifiers: [],
    exportKind: "value",
    source: null,
    assertions: [],
    attributes: [],
  });
}

export function exportTypeAlias(
  name: string,
  type: TSESTree.TypeNode,
): TSESTree.ExportNamedDeclarationWithoutSourceWithSingle {
  return asNode<TSESTree.ExportNamedDeclarationWithoutSourceWithSingle>({
    type: AST_NODE_TYPES.ExportNamedDeclaration,
    declaration: tsTypeAlias(name, type),
    specifiers: [],
    exportKind: "type",
    source: null,
    assertions: [],
    attributes: [],
  });
}

export function tsAsConst(expression: TSESTree.Expression): TSESTree.TSAsExpression {
  return asNode<TSESTree.TSAsExpression>({
    type: AST_NODE_TYPES.TSAsExpression,
    expression,
    typeAnnotation: tsTypeReference("const"),
  });
}

import type { TSESTree } from '@typescript-eslint/types'

import type { HttpVerb } from '../types/http.js'
import {
  id,
  str,
  tsLiteralType,
  tsNullKeyword,
  tsPropertySignature,
  tsTupleType,
  tsTypeAlias,
  tsTypeLiteral,
  tsTypeQuery,
} from './ast/builders.js'

export function buildRouteByPathMethodType(
  routesByPath: Map<
    string,
    Array<{
      method: HttpVerb
      parentLayout: string | null
      importName: string
      layoutChain: string[]
    }>
  >,
): TSESTree.TSTypeAliasDeclaration {
  const properties: TSESTree.TypeElement[] = []
  const sortedPaths = [...routesByPath.keys()].sort()

  for (const urlPath of sortedPaths) {
    const entries = routesByPath.get(urlPath) ?? []
    const methodProperties: TSESTree.TypeElement[] = []

    for (const entry of [...entries].sort((left, right) => left.method.localeCompare(right.method))) {
      const parentType = entry.parentLayout === null
        ? tsNullKeyword()
        : tsLiteralType(entry.parentLayout)

      const layoutChainType = tsTupleType(
        entry.layoutChain.map(layoutId => tsLiteralType(layoutId)),
      )

      methodProperties.push(
        tsPropertySignature(
          id(entry.method),
          tsTypeLiteral([
            tsPropertySignature(id('parent'), parentType),
            tsPropertySignature(id('layoutChain'), layoutChainType),
            tsPropertySignature(id('route'), tsTypeQuery(entry.importName)),
          ]),
        ),
      )
    }

    properties.push(
      tsPropertySignature(
        str(urlPath),
        tsTypeLiteral(methodProperties),
      ),
    )
  }

  return tsTypeAlias('RouteByPathMethodGen', tsTypeLiteral(properties))
}

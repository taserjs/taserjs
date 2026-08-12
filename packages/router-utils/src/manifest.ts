import type { StandardSchemaV1 } from '@standard-schema/spec'

import type { ReturnsMap } from './validate.js'

export function collectReturnsFromDefinitions(
  definitions: readonly { returns?: ReturnsMap | Record<number, StandardSchemaV1> | Record<number, unknown> }[],
): Record<number, StandardSchemaV1> {
  const result: Record<number, StandardSchemaV1> = {}
  for (const definition of definitions) {
    if (definition.returns) {
      Object.assign(result, definition.returns)
    }
  }
  return result
}

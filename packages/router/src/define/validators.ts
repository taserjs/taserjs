import type { Schema } from '../types/schema.js'
import { SCHEMA_KEYS, type SchemaKey } from '../constants.js'

export type SchemaValidators = {
  query?: Schema<unknown>
  params?: Schema<unknown>
  body?: Schema<unknown>
}

export function pickDefinedSchemas(
  source: SchemaValidators,
  keyMap?: Partial<Record<SchemaKey, string>>,
): Record<string, Schema<unknown>> {
  const result: Record<string, Schema<unknown>> = {}
  for (const key of SCHEMA_KEYS) {
    const value = source[key]
    if (value !== undefined) {
      result[keyMap?.[key] ?? key] = value
    }
  }
  return result
}

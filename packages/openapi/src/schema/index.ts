import { inspectSchemaToJsonSchema } from "./inspector.js";
import { resolveStandardJsonSchemaAsync } from "./standard.js";
import type { SchemaResolveOptions } from "./types.js";

export * from "./types.js";
export * from "./standard.js";
export * from "./inspector.js";
export * from "./registry.js";

/**
 * Converts a Standard Schema (Zod, ArkType, Valibot, TypeBox, etc.) or raw JSON schema
 * into an OpenAPI v3.1 compliant JSON Schema object synchronously.
 */
export function standardSchemaToJsonSchema(
  schema: unknown,
  options: SchemaResolveOptions = {},
): Record<string, unknown> {
  if (options.transformSchema) {
    const custom = options.transformSchema(schema);
    if (custom && typeof custom === "object" && !(custom instanceof Promise)) {
      return custom;
    }
  }

  return inspectSchemaToJsonSchema(schema, options);
}

/**
 * Converts a Standard Schema into an OpenAPI JSON Schema object asynchronously,
 * supporting async transformers such as `xsschema.toJsonSchema`.
 */
export async function standardSchemaToJsonSchemaAsync(
  schema: unknown,
  options: SchemaResolveOptions = {},
): Promise<Record<string, unknown>> {
  if (options.transformSchema) {
    const custom = await options.transformSchema(schema);
    if (custom && typeof custom === "object") {
      return custom;
    }
  }

  const asyncResult = await resolveStandardJsonSchemaAsync(schema, options);
  if (asyncResult) {
    return asyncResult;
  }

  return inspectSchemaToJsonSchema(schema, options);
}

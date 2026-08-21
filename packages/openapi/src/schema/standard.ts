import { toJsonSchema as xsschemaToJsonSchema } from "xsschema";
import type { StandardJSONSchemaV1, SchemaResolveOptions } from "./types.js";

/**
 * Checks if a schema object is already a valid JSON Schema object.
 */
export function isRawJsonSchema(schema: unknown): schema is Record<string, unknown> {
  if (!schema || typeof schema !== "object") return false;
  if ("~standard" in schema) return false;
  if ("_def" in schema) return false;
  return (
    "type" in schema ||
    "properties" in schema ||
    "$ref" in schema ||
    "anyOf" in schema ||
    "oneOf" in schema ||
    "allOf" in schema
  );
}

/**
 * Resolves JSON schema from a Standard Schema V1 instance synchronously.
 */
export function resolveStandardJsonSchema(
  schema: unknown,
  options: SchemaResolveOptions = {},
): Record<string, unknown> | undefined {
  if (!schema || (typeof schema !== "object" && typeof schema !== "function")) return undefined;

  // 1. Raw JSON Schema object
  if (isRawJsonSchema(schema)) {
    return schema;
  }

  // 2. Standard JSON Schema spec
  if ("~standard" in schema) {
    const std = (schema as StandardJSONSchemaV1)["~standard"];
    if (std?.jsonSchema) {
      const target = options.target ?? "draft-2020-12";
      if (typeof std.jsonSchema.output === "function") {
        try {
          return std.jsonSchema.output({ target });
        } catch {
          // Fall through (e.g. on File / custom instanceof types)
        }
      }
      if (typeof std.jsonSchema.input === "function") {
        try {
          return std.jsonSchema.input({ target });
        } catch {
          // Fall through
        }
      }
    }
  }

  return undefined;
}

/**
 * Resolves JSON schema from a Standard Schema V1 instance asynchronously using xsschema.
 */
export async function resolveStandardJsonSchemaAsync(
  schema: unknown,
  options: SchemaResolveOptions = {},
): Promise<Record<string, unknown> | undefined> {
  if (!schema || (typeof schema !== "object" && typeof schema !== "function")) return undefined;

  // 1. Raw JSON Schema object
  if (isRawJsonSchema(schema)) {
    return schema;
  }

  // 2. Try xsschema for Standard Schema instances
  if ("~standard" in schema) {
    try {
      const result = await xsschemaToJsonSchema(schema as any);
      if (result && typeof result === "object") {
        return result as Record<string, unknown>;
      }
    } catch {
      // Fall through to synchronous resolution / inspector fallback
    }
  }

  return resolveStandardJsonSchema(schema, options);
}

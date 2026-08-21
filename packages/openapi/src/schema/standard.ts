import type { StandardJSONSchemaV1, SchemaResolveOptions } from "./types.js";

/**
 * Checks if a schema object is already a valid JSON Schema object.
 */
export function isRawJsonSchema(schema: unknown): schema is Record<string, unknown> {
  if (!schema || typeof schema !== "object") return false;
  if ("~standard" in schema) return false;
  if ("_def" in schema) return false;
  return "type" in schema || "properties" in schema || "$ref" in schema || "anyOf" in schema || "oneOf" in schema || "allOf" in schema;
}

/**
 * Resolves JSON schema from a Standard Schema V1 instance implementing StandardJSONSchemaV1.
 */
export function resolveStandardJsonSchema(
  schema: unknown,
  options: SchemaResolveOptions = {},
): Record<string, unknown> | undefined {
  if (!schema || typeof schema !== "object") return undefined;

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
          // Fall through to custom inspector if standard jsonSchema processor throws (e.g. Zod on custom/instanceof types)
        }
      }
      if (typeof std.jsonSchema.input === "function") {
        try {
          return std.jsonSchema.input({ target });
        } catch {
          // Fall through to custom inspector
        }
      }
    }
  }

  return undefined;
}

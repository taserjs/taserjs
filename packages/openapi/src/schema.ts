import type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * Converts a Standard Schema (Zod, Valibot, ArkType, etc.) instance
 * into an OpenAPI v3.1 compliant JSON Schema object.
 */
export function standardSchemaToJsonSchema(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== "object") {
    return { type: "object" };
  }

  // 1. Zod v3 / Zod 4 schema inspection
  if ("_def" in schema) {
    return zodToJsonSchema(schema as any);
  }

  // 2. Standard Schema ~standard spec metadata inspection if provided
  if ("~standard" in schema) {
    const std = (schema as StandardSchemaV1)["~standard"];
    if (std && typeof std === "object" && "jsonSchema" in std) {
      return (std as any).jsonSchema;
    }
  }

  // 3. Fallback generic schema representation
  return { type: "object" };
}

function zodToJsonSchema(zodSchema: any): Record<string, unknown> {
  const def = zodSchema._def;
  if (!def) return { type: "object" };

  const typeName = def.typeName;

  switch (typeName) {
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return { type: "number" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodNull":
      return { type: "null" };
    case "ZodArray":
      return {
        type: "array",
        items: standardSchemaToJsonSchema(def.type),
      };
    case "ZodObject": {
      const shape = typeof def.shape === "function" ? def.shape() : def.shape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      if (shape && typeof shape === "object") {
        for (const [key, propSchema] of Object.entries(shape)) {
          properties[key] = standardSchemaToJsonSchema(propSchema);
          if (propSchema && typeof propSchema === "object" && (propSchema as any)._def?.typeName !== "ZodOptional") {
            required.push(key);
          }
        }
      }

      return {
        type: "object",
        properties,
        ...(required.length > 0 ? { required } : {}),
      };
    }
    case "ZodOptional":
      return standardSchemaToJsonSchema(def.innerType);
    case "ZodEnum":
      return {
        type: "string",
        enum: def.values,
      };
    case "ZodUnion":
      return {
        oneOf: (def.options || []).map((option: any) => standardSchemaToJsonSchema(option)),
      };
    default:
      return { type: "object" };
  }
}

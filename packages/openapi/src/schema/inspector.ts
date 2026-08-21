import { resolveStandardJsonSchema } from "./standard.js";
import type { SchemaResolveOptions } from "./types.js";

const UNRESOLVED = Symbol.for("taser.openapi.unresolved");

/**
 * Returns true when the schema could not be converted to JSON Schema and the
 * result is the generic `{ type: "object" }` fallback emitted by
 * {@link inspectSchemaToJsonSchema}.
 */
export function isUnresolvedSchema(schema: unknown): boolean {
  return (
    typeof schema === "object" &&
    schema !== null &&
    (schema as Record<symbol, unknown>)[UNRESOLVED] === true
  );
}

/**
 * Converts Standard Schema instances or web types into OpenAPI v3.1 JSON Schema.
 *
 * Library-agnostic by design: schemas are resolved through the Standard Schema
 * JSON Schema interface (`~standard.jsonSchema`) or raw JSON Schema objects.
 * Zod (v4+), Valibot (+ @valibot/to-json-schema), ArkType and TypeBox all work
 * without any vendor-specific code paths.
 */
export function inspectSchemaToJsonSchema(
  schema: unknown,
  options: SchemaResolveOptions = {},
): Record<string, unknown> {
  if (!schema) {
    return { type: "object" };
  }

  const hasStandard =
    typeof schema === "object" || typeof schema === "function"
      ? "~standard" in (schema as object)
      : false;

  // 1. Web constructor functions (e.g. File, Blob, Buffer, FormData, URLSearchParams)
  if (typeof schema === "function" && !hasStandard) {
    if (schema.name === "File" || schema.name === "Blob" || schema.name === "Buffer") {
      return { type: "string", format: "binary" };
    }
    if (schema.name === "FormData") {
      return { type: "object" };
    }
    if (schema.name === "URLSearchParams") {
      return { type: "object", "x-content-type": "application/x-www-form-urlencoded" };
    }
    return { type: "object" };
  }

  if (typeof schema !== "object" && typeof schema !== "function") {
    return { type: "object" };
  }

  // 2. Raw JSON Schema / Standard JSON Schema resolution
  const standardResult = resolveStandardJsonSchema(schema, options);
  if (standardResult) {
    return standardResult;
  }

  // 3. Taser built-in validation error schema
  if ("~standard" in schema) {
    const std = (schema as any)["~standard"];
    if (std?.vendor === "taser") {
      return {
        type: "object",
        properties: {
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                message: { type: "string" },
                path: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["message"],
            },
          },
        },
        required: ["errors"],
      };
    }
  }

  // 4. Unsupported schema: warn and fall back to a generic object schema
  const vendor = (schema as any)["~standard"]?.vendor ?? "unknown";
  console.warn(
    `[taser/openapi] Could not derive JSON Schema from a "${vendor}" schema. ` +
      "Use a Standard Schema library with JSON Schema support " +
      "(zod v4+, valibot + @valibot/to-json-schema, arktype, typebox), " +
      "or pass a raw JSON Schema object.",
  );
  const fallback: Record<string, unknown> = { type: "object" };
  Object.defineProperty(fallback, UNRESOLVED, { value: true, enumerable: false });
  return fallback;
}

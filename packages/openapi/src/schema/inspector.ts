import { resolveStandardJsonSchema } from "./standard.js";
import type { SchemaResolveOptions } from "./types.js";

/**
 * Inspects a standard schema or Zod schema structure and converts it into a valid
 * OpenAPI v3.1 compliant JSON Schema.
 */
export function inspectSchemaToJsonSchema(
  schema: unknown,
  options: SchemaResolveOptions = {},
): Record<string, unknown> {
  if (!schema) {
    return { type: "object" };
  }

  // 1. Raw constructor functions (e.g. File, Blob, FormData, URLSearchParams)
  if (typeof schema === "function") {
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

  if (typeof schema !== "object") {
    return { type: "object" };
  }

  // 2. Try standard JSON Schema resolution or raw JSON Schema
  const standardResult = resolveStandardJsonSchema(schema, options);
  if (standardResult) {
    return standardResult;
  }

  // 3. Inspect Zod-like (v3 / v4) or Standard Schema definition objects
  const def = (schema as any)._def ?? (schema as any).def;
  if (def) {
    return convertZodDefToJsonSchema(def, schema, options);
  }

  // 4. Support Taser built-in validation error schema
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

  // 5. Support Valibot / ArkType schema if schema has jsonSchema or toJSONSchema function
  if ("jsonSchema" in schema && typeof (schema as any).jsonSchema === "function") {
    try {
      return (schema as any).jsonSchema();
    } catch {
      // Fall through
    }
  }
  if ("toJSONSchema" in schema && typeof (schema as any).toJSONSchema === "function") {
    try {
      return (schema as any).toJSONSchema();
    } catch {
      // Fall through
    }
  }

  // 6. Fallback generic schema
  return { type: "object" };
}

function convertZodDefToJsonSchema(
  def: any,
  schema: any,
  options: SchemaResolveOptions,
): Record<string, unknown> {
  if (!def) return { type: "object" };

  const typeName = def.typeName ?? def.type;

  let result: Record<string, unknown> = { type: "object" };

  switch (typeName) {
    case "ZodString":
    case "string": {
      result = { type: "string" };
      if (def.format) {
        result.format = def.format;
      }
      if (def.minLength !== undefined && def.minLength !== null) {
        result.minLength = def.minLength;
      }
      if (def.maxLength !== undefined && def.maxLength !== null) {
        result.maxLength = def.maxLength;
      }
      if (Array.isArray(def.checks)) {
        for (const check of def.checks) {
          const kind = check.kind ?? check.type ?? check.def?.type;
          switch (kind) {
            case "min":
            case "minLength":
              result.minLength = check.value ?? check.def?.value;
              break;
            case "max":
            case "maxLength":
              result.maxLength = check.value ?? check.def?.value;
              break;
            case "length":
              result.minLength = check.value ?? check.def?.value;
              result.maxLength = check.value ?? check.def?.value;
              break;
            case "email":
              result.format = "email";
              break;
            case "url":
              result.format = "uri";
              break;
            case "uuid":
              result.format = "uuid";
              break;
            case "cuid":
            case "cuid2":
              result.format = "cuid";
              break;
            case "datetime":
              result.format = "date-time";
              break;
            case "date":
              result.format = "date";
              break;
            case "time":
              result.format = "time";
              break;
            case "ip":
              result.format = check.version === "v6" ? "ipv6" : "ipv4";
              break;
            case "regex":
              if (check.regex instanceof RegExp) {
                result.pattern = check.regex.source;
              }
              break;
          }
        }
      }
      break;
    }

    case "ZodNumber":
    case "number": {
      result = { type: "number" };
      if (Array.isArray(def.checks)) {
        for (const check of def.checks) {
          const kind = check.kind ?? check.type ?? check.def?.type;
          switch (kind) {
            case "min":
            case "minimum":
              if (check.inclusive ?? check.def?.inclusive) {
                result.minimum = check.value ?? check.def?.value;
              } else {
                result.exclusiveMinimum = check.value ?? check.def?.value;
              }
              break;
            case "max":
            case "maximum":
              if (check.inclusive ?? check.def?.inclusive) {
                result.maximum = check.value ?? check.def?.value;
              } else {
                result.exclusiveMaximum = check.value ?? check.def?.value;
              }
              break;
            case "int":
              result.type = "integer";
              break;
            case "multipleOf":
              result.multipleOf = check.value ?? check.def?.value;
              break;
          }
        }
      }
      break;
    }

    case "ZodBoolean":
    case "boolean":
      result = { type: "boolean" };
      break;

    case "ZodNull":
    case "null":
      result = { type: "null" };
      break;

    case "ZodLiteral":
    case "literal":
      result = {
        type: typeof (def.value ?? def.values?.[0]),
        const: def.value ?? def.values?.[0],
      };
      break;

    case "ZodEnum":
    case "enum": {
      const values = Array.isArray(def.values)
        ? [...def.values]
        : Array.isArray(def.entries)
          ? [...def.entries]
          : [];
      result = {
        type: "string",
        enum: values,
      };
      break;
    }

    case "ZodNativeEnum":
    case "nativeEnum": {
      const values = Object.values(def.values ?? def.entries ?? {}).filter(
        (v) => typeof v === "string" || typeof v === "number",
      );
      const isAllNumbers = values.every((v) => typeof v === "number");
      result = {
        type: isAllNumbers ? "number" : "string",
        enum: values,
      };
      break;
    }

    case "ZodArray":
    case "array": {
      const elemType = def.type ?? def.element ?? def.items;
      const itemSchema = inspectSchemaToJsonSchema(elemType, options);
      result = {
        type: "array",
        items: itemSchema,
      };
      if (def.minLength !== null && def.minLength !== undefined) {
        result.minItems = def.minLength.value ?? def.minLength;
      }
      if (def.maxLength !== null && def.maxLength !== undefined) {
        result.maxItems = def.maxLength.value ?? def.maxLength;
      }
      if (def.exactLength !== null && def.exactLength !== undefined) {
        const len = def.exactLength.value ?? def.exactLength;
        result.minItems = len;
        result.maxItems = len;
      }
      break;
    }

    case "ZodObject":
    case "object": {
      const shape =
        typeof def.shape === "function"
          ? def.shape()
          : (def.shape ?? (schema && typeof schema.shape === "function" ? schema.shape() : schema?.shape));
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      if (shape && typeof shape === "object") {
        for (const [key, propSchema] of Object.entries(shape)) {
          properties[key] = inspectSchemaToJsonSchema(propSchema, options);
          if (!isZodOptional(propSchema)) {
            required.push(key);
          }
        }
      }

      result = {
        type: "object",
        properties,
        ...(required.length > 0 ? { required } : {}),
      };

      if (def.unknownKeys === "strict" || def.strict === true) {
        result.additionalProperties = false;
      } else if (def.unknownKeys === "passthrough" || def.passthrough === true) {
        result.additionalProperties = true;
      }
      break;
    }

    case "ZodRecord":
    case "record": {
      const valueSchema = inspectSchemaToJsonSchema(def.valueType ?? def.element, options);
      result = {
        type: "object",
        additionalProperties: valueSchema,
      };
      break;
    }

    case "ZodTuple":
    case "tuple": {
      const itemsList = Array.isArray(def.items) ? def.items : Array.isArray(def.elements) ? def.elements : [];
      const items = itemsList.map((item: any) => inspectSchemaToJsonSchema(item, options));
      result = {
        type: "array",
        prefixItems: items,
        items: def.rest ? inspectSchemaToJsonSchema(def.rest, options) : false,
        minItems: items.length,
        maxItems: def.rest ? undefined : items.length,
      };
      break;
    }

    case "ZodUnion":
    case "union": {
      const optionsList = Array.isArray(def.options)
        ? def.options.map((opt: any) => inspectSchemaToJsonSchema(opt, options))
        : [];
      result = { oneOf: optionsList };
      break;
    }

    case "ZodDiscriminatedUnion":
    case "discriminatedUnion": {
      const optionsList = def.options
        ? (Array.isArray(def.options)
            ? def.options
            : Array.from(def.options.values?.() ?? [])
          ).map((opt: any) => inspectSchemaToJsonSchema(opt, options))
        : [];
      result = {
        oneOf: optionsList,
        ...(def.discriminator ? { discriminator: { propertyName: def.discriminator } } : {}),
      };
      break;
    }

    case "ZodIntersection":
    case "intersection": {
      result = {
        allOf: [
          inspectSchemaToJsonSchema(def.left, options),
          inspectSchemaToJsonSchema(def.right, options),
        ],
      };
      break;
    }

    case "ZodOptional":
    case "optional":
      return inspectSchemaToJsonSchema(def.innerType ?? def.schema, options);

    case "ZodNullable":
    case "nullable": {
      const inner = inspectSchemaToJsonSchema(def.innerType ?? def.schema, options);
      if (typeof inner.type === "string") {
        return { ...inner, type: [inner.type, "null"] };
      }
      return { oneOf: [inner, { type: "null" }] };
    }

    case "ZodDefault":
    case "default": {
      const inner = inspectSchemaToJsonSchema(def.innerType ?? def.schema, options);
      const defaultVal =
        typeof def.defaultValue === "function" ? def.defaultValue() : (def.defaultValue ?? def.value);
      return { ...inner, default: defaultVal };
    }

    case "ZodAny":
    case "any":
    case "ZodUnknown":
    case "unknown":
      return {};

    case "ZodCustom":
    case "custom": {
      // 1. Check if fn matches File / Blob / Buffer / FormData
      if (typeof def.fn === "function") {
        try {
          if (typeof File !== "undefined" && def.fn(new File([""], "test.txt"))) {
            return { type: "string", format: "binary" };
          }
          if (typeof Blob !== "undefined" && def.fn(new Blob([]))) {
            return { type: "string", format: "binary" };
          }
          if (typeof Buffer !== "undefined" && def.fn(Buffer.from(""))) {
            return { type: "string", format: "binary" };
          }
          if (typeof FormData !== "undefined" && def.fn(new FormData())) {
            return { type: "object" };
          }
          if (typeof URLSearchParams !== "undefined" && def.fn(new URLSearchParams())) {
            return { type: "object", "x-content-type": "application/x-www-form-urlencoded" };
          }
        } catch {
          // Ignore
        }
      }

      // 2. Check Zod v3 refinement error message
      try {
        if (typeof def.effect?.refinement === "function") {
          const ctx: any = { addIssue: (issue: any) => { ctx.issue = issue; } };
          def.effect.refinement({}, ctx);
          const msg = String(ctx.issue?.message ?? "");
          if (/instance of (File|Blob|Buffer|Uint8Array)/i.test(msg)) {
            return { type: "string", format: "binary" };
          }
          if (/instance of (FormData)/i.test(msg)) {
            return { type: "object" };
          }
          if (/instance of (URLSearchParams)/i.test(msg)) {
            return { type: "object", "x-content-type": "application/x-www-form-urlencoded" };
          }
        }
      } catch {
        // Ignore
      }

      const clsName = def.cls?.name || def.name;
      if (clsName === "File" || clsName === "Blob" || clsName === "Buffer" || clsName === "Uint8Array") {
        return { type: "string", format: "binary" };
      }
      if (clsName === "FormData") {
        return { type: "object" };
      }
      if (clsName === "URLSearchParams") {
        return { type: "object", "x-content-type": "application/x-www-form-urlencoded" };
      }
      return {};
    }

    case "ZodEffects":
    case "effects":
    case "ZodTransformer":
    case "ZodBranded":
    case "ZodReadonly":
    case "ZodPipeline": {
      const inner = def.schema ?? def.in ?? def.innerType;
      if (inner && inner._def?.typeName !== "ZodAny" && inner._def?.typeName !== "ZodUnknown" && inner.def?.type !== "any" && inner.def?.type !== "unknown") {
        return inspectSchemaToJsonSchema(inner, options);
      }

      // Check if this refinement is z.instanceof(...) by evaluating on dummy input
      if (typeof def.fn === "function") {
        try {
          if (typeof File !== "undefined" && def.fn(new File([""], "test.txt"))) {
            return { type: "string", format: "binary" };
          }
          if (typeof Blob !== "undefined" && def.fn(new Blob([]))) {
            return { type: "string", format: "binary" };
          }
          if (typeof Buffer !== "undefined" && def.fn(Buffer.from(""))) {
            return { type: "string", format: "binary" };
          }
          if (typeof FormData !== "undefined" && def.fn(new FormData())) {
            return { type: "object" };
          }
          if (typeof URLSearchParams !== "undefined" && def.fn(new URLSearchParams())) {
            return { type: "object", "x-content-type": "application/x-www-form-urlencoded" };
          }
        } catch {
          // Ignore
        }
      }

      try {
        if (typeof def.effect?.refinement === "function") {
          const ctx: any = { addIssue: (issue: any) => { ctx.issue = issue; } };
          def.effect.refinement({}, ctx);
          const msg = String(ctx.issue?.message ?? "");
          if (/instance of (File|Blob|Buffer|Uint8Array)/i.test(msg)) {
            return { type: "string", format: "binary" };
          }
          if (/instance of (FormData)/i.test(msg)) {
            return { type: "object" };
          }
          if (/instance of (URLSearchParams)/i.test(msg)) {
            return { type: "object", "x-content-type": "application/x-www-form-urlencoded" };
          }
        }
      } catch {
        // Ignore
      }

      const clsName = def.cls?.name || def.name;
      if (clsName === "File" || clsName === "Blob" || clsName === "Buffer" || clsName === "Uint8Array") {
        return { type: "string", format: "binary" };
      }
      if (clsName === "FormData") {
        return { type: "object" };
      }
      if (clsName === "URLSearchParams") {
        return { type: "object", "x-content-type": "application/x-www-form-urlencoded" };
      }
      if (inner) {
        return inspectSchemaToJsonSchema(inner, options);
      }
      return {};
    }

    case "ZodLazy":
    case "lazy": {
      const getter = def.getter ?? def.fn;
      if (typeof getter === "function") {
        try {
          return inspectSchemaToJsonSchema(getter(), options);
        } catch {
          return { type: "object" };
        }
      }
      return { type: "object" };
    }

    default: {
      const clsName = def.cls?.name || def.name;
      if (clsName === "File" || clsName === "Blob" || clsName === "Buffer" || clsName === "Uint8Array") {
        return { type: "string", format: "binary" };
      }
      if (clsName === "FormData") {
        return { type: "object" };
      }
      if (clsName === "URLSearchParams") {
        return { type: "object", "x-content-type": "application/x-www-form-urlencoded" };
      }
      result = { type: "object" };
    }
  }

  // Attach description / openapi metadata if present on def
  if (def.description) {
    result.description = def.description;
  }
  if (def.openapi && typeof def.openapi === "object") {
    Object.assign(result, def.openapi);
  }

  return result;
}

function isZodOptional(schema: any): boolean {
  if (!schema || typeof schema !== "object") return false;
  const def = schema._def ?? schema.def;
  if (!def) return false;
  if (def.typeName === "ZodOptional" || def.type === "ZodOptional" || def.type === "optional") return true;
  if (def.typeName === "ZodDefault" || def.type === "ZodDefault" || def.type === "default") return true;
  if (def.innerType) return isZodOptional(def.innerType);
  if (def.schema) return isZodOptional(def.schema);
  return false;
}

import type { StandardSchemaV1 } from "@standard-schema/spec";

export type ValidationFacet = "params" | "query" | "headers" | "body";

export class ValidationError extends Error {
  readonly issues: readonly StandardSchemaV1.Issue[];
  readonly facet: ValidationFacet;

  constructor(
    issues: readonly StandardSchemaV1.Issue[],
    facet: ValidationFacet,
    message?: string,
  ) {
    super(message ?? `Validation failed for ${facet}`);
    this.name = "ValidationError";
    this.issues = issues;
    this.facet = facet;
  }
}

export function isStandardSchema(value: unknown): value is StandardSchemaV1 {
  return (
    typeof value === "object" &&
    value !== null &&
    "~standard" in value &&
    typeof (value as StandardSchemaV1)["~standard"] === "object" &&
    (value as StandardSchemaV1)["~standard"] !== null &&
    typeof (value as StandardSchemaV1)["~standard"].validate === "function"
  );
}

export async function validateStandardSchema<TOutput = unknown>(
  schema: StandardSchemaV1<unknown, TOutput>,
  value: unknown,
  facet: ValidationFacet,
): Promise<TOutput> {
  let result = schema["~standard"].validate(value);
  if (result instanceof Promise) {
    result = await result;
  }

  if (result.issues) {
    throw new ValidationError(result.issues, facet);
  }

  return result.value;
}

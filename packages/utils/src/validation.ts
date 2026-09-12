import type { StandardSchemaV1 } from "@standard-schema/spec";

export type ValidationFacet = "params" | "query" | "body";

class BaseZeroTraceError extends Error {
  constructor(message?: string) {
    const errorConstructor = Error as unknown as { stackTraceLimit?: number };
    const prevLimit = errorConstructor.stackTraceLimit;
    if (typeof prevLimit === "number") {
      errorConstructor.stackTraceLimit = 0;
    }
    try {
      super(message);
    } finally {
      if (typeof prevLimit === "number") {
        errorConstructor.stackTraceLimit = prevLimit;
      }
    }
  }
}

export class ValidationError extends BaseZeroTraceError {
  readonly issues: readonly StandardSchemaV1.Issue[];
  readonly facet: ValidationFacet;

  constructor(issues: readonly StandardSchemaV1.Issue[], facet: ValidationFacet, message?: string) {
    super(message ?? `Validation failed for ${facet}`);
    this.name = "ValidationError";
    this.issues = issues;
    this.facet = facet;
    this.stack = `${this.name}: ${this.message}`;
  }
}

export class ResponseValidationError extends BaseZeroTraceError {
  readonly status: number;
  readonly data: unknown;
  readonly issues: readonly StandardSchemaV1.Issue[];

  constructor(
    status: number,
    data: unknown,
    issues: readonly StandardSchemaV1.Issue[],
    message?: string,
  ) {
    super(message ?? `Response validation failed for status ${status}`);
    this.name = "ResponseValidationError";
    this.status = status;
    this.data = data;
    this.issues = issues;
    this.stack = `${this.name}: ${this.message}`;
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

export function executeSchema<TOutput = unknown>(
  schema: StandardSchemaV1<unknown, TOutput>,
  value: unknown,
): StandardSchemaV1.Result<TOutput> | Promise<StandardSchemaV1.Result<TOutput>> {
  return schema["~standard"].validate(value);
}

export async function validateStandardSchema<TOutput = unknown>(
  schema: StandardSchemaV1<unknown, TOutput>,
  value: unknown,
  facet: ValidationFacet,
): Promise<TOutput> {
  let result = executeSchema(schema, value);
  if (result instanceof Promise) {
    result = await result;
  }

  if (result.issues) {
    throw new ValidationError(result.issues, facet);
  }

  return result.value;
}

export async function validateResponseSchema<TOutput = unknown>(
  schema: StandardSchemaV1<unknown, TOutput>,
  value: unknown,
  status: number,
): Promise<TOutput> {
  let result = executeSchema(schema, value);
  if (result instanceof Promise) {
    result = await result;
  }

  if (result.issues) {
    throw new ResponseValidationError(status, value, result.issues);
  }

  return result.value;
}

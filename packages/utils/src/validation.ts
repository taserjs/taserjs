import type { StandardSchemaV1 } from "@standard-schema/spec";

import { ZeroTraceError } from "./errors.js";

export type ValidationFacet = "params" | "query" | "body";

export class ValidationError extends ZeroTraceError {
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

export class ResponseValidationError extends ZeroTraceError {
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

export function executeSchema<TOutput = unknown>(
  schema: StandardSchemaV1<unknown, TOutput>,
  value: unknown,
): StandardSchemaV1.Result<TOutput> | Promise<StandardSchemaV1.Result<TOutput>> {
  return schema["~standard"].validate(value);
}

function unwrapResponseResult<TOutput>(
  result: StandardSchemaV1.Result<TOutput>,
  status: number,
  value: unknown,
): TOutput {
  if (result.issues) {
    throw new ResponseValidationError(status, value, result.issues);
  }
  return result.value;
}

export function validateResponseSchema<TOutput = unknown>(
  schema: StandardSchemaV1<unknown, TOutput>,
  value: unknown,
  status: number,
): TOutput | Promise<TOutput> {
  const result = executeSchema(schema, value);
  return result instanceof Promise
    ? result.then((settled) => unwrapResponseResult(settled, status, value))
    : unwrapResponseResult(result, status, value);
}

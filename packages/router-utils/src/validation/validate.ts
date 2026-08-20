import type { StandardSchemaV1 } from "@standard-schema/spec";

import { STATUS_BAD_GATEWAY } from "../http/constants.js";
import { createReplyResult, isReplyResult, type ReplyResult } from "../reply/result.js";

export type ResponseValidationFailureHandler = (args: {
  issues: readonly StandardSchemaV1.Issue[];
  request: Request;
}) => void;

export type ValidateReplyOptions = {
  request: Request;
  onValidationFailure?: ResponseValidationFailureHandler | undefined;
};

export class ValidationError extends Error {
  constructor(
    readonly issues: readonly StandardSchemaV1.Issue[],
    message = "Validation failed",
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Default 422 body shape matching `validateSchema` failures. */
export const validationErrorSchema: StandardSchemaV1<
  { errors: readonly StandardSchemaV1.Issue[] },
  { errors: readonly StandardSchemaV1.Issue[] }
> = {
  "~standard": {
    version: 1,
    vendor: "taser",
    validate(value) {
      if (
        typeof value === "object" &&
        value !== null &&
        "errors" in value &&
        Array.isArray(value.errors)
      ) {
        return { value: value as { errors: readonly StandardSchemaV1.Issue[] } };
      }
      return {
        issues: [{ message: "Expected validation error payload { errors: Issue[] }" }],
      };
    },
  },
};

export type ReturnsMap = {
  readonly [status: number]: StandardSchemaV1;
};

export function mergeReturnsMaps(
  ...maps: Array<ReturnsMap | Record<number, StandardSchemaV1> | undefined | null>
): Record<number, StandardSchemaV1> {
  const result: Record<number, StandardSchemaV1> = {};
  for (const map of maps) {
    if (!map) {
      continue;
    }
    for (const [key, schema] of Object.entries(map)) {
      if (schema !== undefined) {
        result[Number(key)] = schema;
      }
    }
  }
  return result;
}

export function hasInputSchemas(source: {
  query?: unknown;
  params?: unknown;
  body?: unknown;
  handlerQuery?: unknown;
  handlerParams?: unknown;
  handlerBody?: unknown;
  middlewares?: readonly { query?: unknown; params?: unknown; body?: unknown }[];
  handlerMiddlewares?: readonly { query?: unknown; params?: unknown; body?: unknown }[];
}): boolean {
  if (
    source.query !== undefined ||
    source.params !== undefined ||
    source.body !== undefined ||
    source.handlerQuery !== undefined ||
    source.handlerParams !== undefined ||
    source.handlerBody !== undefined
  ) {
    return true;
  }

  for (const layer of [...(source.middlewares ?? []), ...(source.handlerMiddlewares ?? [])]) {
    if (layer.query !== undefined || layer.params !== undefined || layer.body !== undefined) {
      return true;
    }
  }

  return false;
}

export function withAuto422(
  returns: Record<number, StandardSchemaV1>,
  inject: boolean,
): Record<number, StandardSchemaV1> {
  if (!inject || returns[422] !== undefined) {
    return returns;
  }
  return { ...returns, 422: validationErrorSchema };
}

export async function validateSchema<S extends StandardSchemaV1>(
  schema: S,
  value: unknown,
): Promise<StandardSchemaV1.InferOutput<S>> {
  const result = await schema["~standard"].validate(value);

  if (result.issues) {
    throw new ValidationError(result.issues);
  }

  return result.value;
}

function reportValidationFailure(
  issues: readonly StandardSchemaV1.Issue[],
  request: Request,
  onValidationFailure?: ResponseValidationFailureHandler,
): void {
  if (onValidationFailure) {
    onValidationFailure({ issues, request });
    return;
  }
  console.error("Response validation failed", { url: request.url, issues });
}

/**
 * Validate a reply against a status-keyed returns map.
 * Missing status → skip. Validation failure → 502 with handler body preserved.
 */
export async function validateReply(
  result: Response,
  returnsMap: Record<number, StandardSchemaV1> | undefined | null,
  options: ValidateReplyOptions,
): Promise<Response> {
  if (!returnsMap || Object.keys(returnsMap).length === 0) {
    return result;
  }

  if (!isReplyResult(result)) {
    return result;
  }

  const schema = returnsMap[result.status];
  if (schema === undefined) {
    return result;
  }

  const validated = await schema["~standard"].validate(result.data);
  if (validated.issues) {
    reportValidationFailure(validated.issues, options.request, options.onValidationFailure);

    return createReplyResult(
      result.body,
      {
        status: STATUS_BAD_GATEWAY,
        statusText: "Bad Gateway",
        headers: result.headers,
      },
      result.data,
      result.kind,
    );
  }

  return result;
}

export type { ReplyResult };

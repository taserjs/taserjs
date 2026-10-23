import {
  executeSchema,
  isPlainObject,
  ValidationError,
  type ValidationFacet,
} from "@taserjs/utils";
import type { Context } from "hono";

import { extractBody } from "./body.js";
import type { RouteSchemas, TaserRequest } from "./types.js";

type AnyTaserRequest = TaserRequest<any, any, any>;
type ValidationIssues = ValidationError["issues"];
type BodySchema = NonNullable<RouteSchemas["body"]>["schema"];

/** A rejected input facet. Returned instead of thrown so callers can skip the unwind. */
export interface ValidationFailure {
  readonly issues: ValidationIssues;
  readonly facet: ValidationFacet;
}

type ValidationOutcome = ValidationFailure | undefined;

export function hasSchemas(schemas?: RouteSchemas | undefined): boolean {
  return Boolean(schemas && (schemas.params || schemas.query || schemas.body));
}

function mergeValidated(original: unknown, validated: unknown): unknown {
  return isPlainObject(validated) && isPlainObject(original)
    ? { ...original, ...validated }
    : validated;
}

function failure(issues: ValidationIssues, facet: ValidationFacet): ValidationFailure {
  return { issues, facet };
}

async function validateBodyFacet(
  schema: BodySchema,
  req: AnyTaserRequest,
): Promise<ValidationOutcome> {
  const result = await executeSchema(schema, req.body);
  if (result.issues) return failure(result.issues, "body");
  req.body = mergeValidated(req.body, result.value);
  return undefined;
}

async function validateRemainingAfterParams(
  schemas: RouteSchemas,
  req: AnyTaserRequest,
  c?: Context,
): Promise<ValidationOutcome> {
  if (schemas.query) {
    const result = await executeSchema(schemas.query, req.query);
    if (result.issues) return failure(result.issues, "query");
    (req as { query: unknown }).query = mergeValidated(req.query, result.value);
  }

  return validateRemainingAfterQuery(schemas, req, c);
}

async function validateRemainingAfterQuery(
  schemas: RouteSchemas,
  req: AnyTaserRequest,
  c?: Context,
): Promise<ValidationOutcome> {
  if (!schemas.body) return undefined;

  if (req.body === undefined && c) {
    req.body = await extractBody(c, schemas.body.mode);
  }
  return validateBodyFacet(schemas.body.schema, req);
}

/**
 * Validates params, query and body in that order, writing validated values back onto `req`.
 *
 * Resolves to the first failing facet instead of throwing, and stays synchronous when every
 * schema validates synchronously. Failures of the input itself (for example an unsupported media
 * type) still throw.
 */
export function validateSchemasResult(
  schemas: RouteSchemas | undefined,
  req: AnyTaserRequest,
  c?: Context,
): ValidationOutcome | Promise<ValidationOutcome> {
  if (!hasSchemas(schemas)) return undefined;
  const s = schemas!;

  if (s.params) {
    const result = executeSchema(s.params, req.params);
    if (result instanceof Promise) {
      return result.then((settled) => {
        if (settled.issues) return failure(settled.issues, "params");
        (req as { params: unknown }).params = mergeValidated(req.params, settled.value);
        return validateRemainingAfterParams(s, req, c);
      });
    }
    if (result.issues) return failure(result.issues, "params");
    (req as { params: unknown }).params = mergeValidated(req.params, result.value);
  }

  if (s.query) {
    const result = executeSchema(s.query, req.query);
    if (result instanceof Promise) {
      return result.then((settled) => {
        if (settled.issues) return failure(settled.issues, "query");
        (req as { query: unknown }).query = mergeValidated(req.query, settled.value);
        return validateRemainingAfterQuery(s, req, c);
      });
    }
    if (result.issues) return failure(result.issues, "query");
    (req as { query: unknown }).query = mergeValidated(req.query, result.value);
  }

  if (s.body) {
    if (req.body === undefined && c) {
      return extractBody(c, s.body.mode).then((body) => {
        req.body = body;
        return validateBodyFacet(s.body!.schema, req);
      });
    }

    const result = executeSchema(s.body.schema, req.body);
    if (result instanceof Promise) {
      return result.then((settled) => {
        if (settled.issues) return failure(settled.issues, "body");
        req.body = mergeValidated(req.body, settled.value);
        return undefined;
      });
    }
    if (result.issues) return failure(result.issues, "body");
    req.body = mergeValidated(req.body, result.value);
  }

  return undefined;
}

/** The 422 envelope for rejected input, shared by the direct path and `app.onError`. */
export function validationErrorResponse(c: Context, issues: ValidationIssues): Response {
  return c.json({ errors: issues }, 422);
}

function throwIfFailed(outcome: ValidationOutcome): void {
  if (outcome) throw new ValidationError(outcome.issues, outcome.facet);
}

/**
 * Same validation as {@link validateSchemasResult}, but a failing facet throws a
 * `ValidationError` so enclosing middleware can catch it.
 */
export function validateSchemas(
  schemas: RouteSchemas | undefined,
  req: AnyTaserRequest,
  c?: Context,
): void | Promise<void> {
  const outcome = validateSchemasResult(schemas, req, c);
  if (outcome instanceof Promise) return outcome.then(throwIfFailed);
  throwIfFailed(outcome);
}

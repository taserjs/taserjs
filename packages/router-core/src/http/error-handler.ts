import { internalServerError, json, noContent } from "@taserjs/router-utils/reply";

export function handlePipelineError(error: unknown): Response {
  if (error instanceof Response) {
    return error;
  }

  if (error instanceof Error) {
    console.error(error);
  } else {
    console.error("Unhandled pipeline error", error);
  }

  return internalServerError();
}

/**
 * Coerce pipeline output to standard Web Response.
 */
export function toResponse(value: unknown): Response {
  if (value instanceof Response) {
    return value;
  }

  if (value === undefined || value === null) {
    return noContent();
  }

  return json(value);
}

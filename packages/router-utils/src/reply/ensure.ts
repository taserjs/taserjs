import { jsonResponse, noContentResponse } from "./build.js";

/**
 * Coerce any pipeline output to standard Web Response.
 */
export function ensureResponse(value: unknown): Response {
  if (value instanceof Response) {
    return value;
  }

  if (value === undefined || value === null) {
    return noContentResponse();
  }

  return jsonResponse(value);
}

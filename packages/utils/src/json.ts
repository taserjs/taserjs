/**
 * Creates a standard JSON Response with appropriate headers.
 *
 * @param data The JSON-serializable payload.
 * @param init Optional HTTP status code number or ResponseInit configuration.
 */
export function json<T>(data: T, init?: number | ResponseInit): Response {
  if (typeof init === "number") {
    return Response.json(data, { status: init });
  }
  return Response.json(data, init);
}

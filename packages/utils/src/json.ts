export interface JsonResponse<T = unknown, TStatus extends number = 200> extends Response {
  readonly _data?: T;
  readonly _status?: TStatus;
  json(): Promise<T>;
}

/**
 * Creates a standard JSON Response with appropriate headers.
 *
 * @param data The JSON-serializable payload.
 * @param init Optional HTTP status code number or ResponseInit configuration.
 */
export function json<T, const TInit extends number | ResponseInit = 200>(
  data: T,
  init?: TInit,
): JsonResponse<
  T,
  TInit extends number
    ? TInit
    : TInit extends { status: infer S extends number }
      ? S
      : 200
> {
  if (typeof init === "number") {
    return Response.json(data, { status: init }) as any;
  }
  return Response.json(data, init) as any;
}


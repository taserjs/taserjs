export interface TypedResponse<T = unknown, TStatus extends number = number>
  extends Response {
  readonly _data?: T;
  readonly _status?: TStatus;
  json(): Promise<T>;
}

export type ExtractStatus<
  TDefault extends number,
  TInit extends ResponseInit | undefined,
> = TInit extends { status: infer S extends number } ? S : TDefault;

function createTypedResponse<T, TStatus extends number>(
  body: BodyInit | null | undefined,
  init: ResponseInit | undefined,
  defaultStatus: TStatus,
  defaultHeaders?: Record<string, string>,
): TypedResponse<T, TStatus> {
  const status = (init?.status ?? defaultStatus) as TStatus;
  const headers = new Headers(init?.headers);

  if (defaultHeaders) {
    for (const [key, value] of Object.entries(defaultHeaders)) {
      if (!headers.has(key)) {
        headers.set(key, value);
      }
    }
  }

  const res = new Response(body, {
    ...init,
    status,
    headers,
  }) as TypedResponse<T, TStatus>;

  return res;
}

/**
 * Creates a JSON TypedResponse.
 */
export function json<T, const TInit extends ResponseInit = ResponseInit>(
  data: T,
  init?: TInit,
): TypedResponse<T, ExtractStatus<200, TInit>> {
  const status = (init?.status ?? 200) as ExtractStatus<200, TInit>;
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }

  const res = new Response(JSON.stringify(data), {
    ...init,
    status,
    headers,
  }) as TypedResponse<T, ExtractStatus<200, TInit>>;

  return res;
}

/**
 * Creates a plain text TypedResponse.
 */
export function text<const TInit extends ResponseInit = ResponseInit>(
  data: string,
  init?: TInit,
): TypedResponse<string, ExtractStatus<200, TInit>> {
  return createTypedResponse(
    data,
    init,
    200 as ExtractStatus<200, TInit>,
    { "content-type": "text/plain; charset=utf-8" },
  );
}

/**
 * Creates an HTML TypedResponse.
 */
export function html<const TInit extends ResponseInit = ResponseInit>(
  data: string,
  init?: TInit,
): TypedResponse<string, ExtractStatus<200, TInit>> {
  return createTypedResponse(
    data,
    init,
    200 as ExtractStatus<200, TInit>,
    { "content-type": "text/html; charset=utf-8" },
  );
}

/**
 * Creates a redirect TypedResponse defaulting to 302.
 */
export function redirect<const TInit extends ResponseInit = ResponseInit>(
  url: string | URL,
  init?: TInit,
): TypedResponse<null, ExtractStatus<302, TInit>> {
  const status = (init?.status ?? 302) as ExtractStatus<302, TInit>;
  const headers = new Headers(init?.headers);
  headers.set("location", typeof url === "string" ? url : url.toString());

  return new Response(null, {
    ...init,
    status,
    headers,
  }) as TypedResponse<null, ExtractStatus<302, TInit>>;
}

/**
 * Creates an error TypedResponse helper factory.
 */
function createErrorReply<TStatus extends number>(defaultStatus: TStatus) {
  return function <T = { message: string }, const TInit extends ResponseInit = ResponseInit>(
    data?: T,
    init?: TInit,
  ): TypedResponse<T, ExtractStatus<TStatus, TInit>> {
    const status = (init?.status ?? defaultStatus) as ExtractStatus<TStatus, TInit>;
    const bodyPayload = data !== undefined ? data : ({ message: `HTTP ${defaultStatus}` } as unknown as T);

    const headers = new Headers(init?.headers);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json; charset=utf-8");
    }

    return new Response(JSON.stringify(bodyPayload), {
      ...init,
      status,
      headers,
    }) as TypedResponse<T, ExtractStatus<TStatus, TInit>>;
  };
}

export const badRequest = createErrorReply(400);
export const unauthorized = createErrorReply(401);
export const forbidden = createErrorReply(403);
export const notFound = createErrorReply(404);
export const methodNotAllowed = createErrorReply(405);
export const conflict = createErrorReply(409);
export const unprocessable = createErrorReply(422);
export const internalServerError = createErrorReply(500);

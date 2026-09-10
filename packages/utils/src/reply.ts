export interface TypedResponse<T = unknown, TStatus extends number = number>
  extends Response {
  readonly _data?: T;
  readonly _status?: TStatus;
  json(): Promise<T>;
}

export type JsonResponse<T = unknown, TStatus extends number = 200> = TypedResponse<T, TStatus>;

export type ExtractStatus<
  TDefault extends number,
  TInit extends number | ResponseInit | undefined,
> = TInit extends number
  ? TInit
  : TInit extends { status: infer S extends number }
    ? S
    : TDefault;

export function createTypedResponse<T, TStatus extends number>(
  body: BodyInit | null | undefined,
  init: number | ResponseInit | undefined,
  defaultStatus: TStatus,
  defaultHeaders?: Record<string, string>,
  dataPayload?: T,
): TypedResponse<T, TStatus> {
  const status = (typeof init === "number" ? init : init?.status ?? defaultStatus) as TStatus;
  const headers = new Headers(typeof init === "object" ? init?.headers : undefined);

  if (defaultHeaders) {
    for (const [key, value] of Object.entries(defaultHeaders)) {
      if (!headers.has(key)) {
        headers.set(key, value);
      }
    }
  }

  const res = new Response(body, {
    ...(typeof init === "object" ? init : {}),
    status,
    headers,
  }) as TypedResponse<T, TStatus>;

  Object.defineProperty(res, "_data", {
    value: dataPayload,
    enumerable: true,
    writable: false,
    configurable: true,
  });
  Object.defineProperty(res, "_status", {
    value: status,
    enumerable: true,
    writable: false,
    configurable: true,
  });

  return res;
}

/**
 * Creates a JSON TypedResponse.
 */
export function json<T, const TInit extends number | ResponseInit = ResponseInit>(
  data: T,
  init?: TInit,
): TypedResponse<T, ExtractStatus<200, TInit>> {
  const status = (typeof init === "number" ? init : init?.status ?? 200) as ExtractStatus<200, TInit>;
  const headers = new Headers(typeof init === "object" ? init?.headers : undefined);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }

  const res = new Response(JSON.stringify(data), {
    ...(typeof init === "object" ? init : {}),
    status,
    headers,
  }) as TypedResponse<T, ExtractStatus<200, TInit>>;

  Object.defineProperty(res, "_data", {
    value: data,
    enumerable: true,
    writable: false,
    configurable: true,
  });
  Object.defineProperty(res, "_status", {
    value: status,
    enumerable: true,
    writable: false,
    configurable: true,
  });

  return res;
}

/**
 * Creates a plain text TypedResponse.
 */
export function text<const TInit extends number | ResponseInit = ResponseInit>(
  data: string,
  init?: TInit,
): TypedResponse<string, ExtractStatus<200, TInit>> {
  return createTypedResponse(
    data,
    init,
    200 as ExtractStatus<200, TInit>,
    { "content-type": "text/plain; charset=utf-8" },
    data,
  );
}

/**
 * Creates an HTML TypedResponse.
 */
export function html<const TInit extends number | ResponseInit = ResponseInit>(
  data: string,
  init?: TInit,
): TypedResponse<string, ExtractStatus<200, TInit>> {
  return createTypedResponse(
    data,
    init,
    200 as ExtractStatus<200, TInit>,
    { "content-type": "text/html; charset=utf-8" },
    data,
  );
}

/**
 * Creates a redirect TypedResponse defaulting to 302.
 */
export function redirect<const TInit extends number | ResponseInit = ResponseInit>(
  url: string | URL,
  init?: TInit,
): TypedResponse<null, ExtractStatus<302, TInit>> {
  const status = (typeof init === "number" ? init : init?.status ?? 302) as ExtractStatus<302, TInit>;
  const headers = new Headers(typeof init === "object" ? init?.headers : undefined);
  headers.set("location", typeof url === "string" ? url : url.toString());

  const res = new Response(null, {
    ...(typeof init === "object" ? init : {}),
    status,
    headers,
  }) as TypedResponse<null, ExtractStatus<302, TInit>>;

  Object.defineProperty(res, "_data", {
    value: null,
    enumerable: true,
    writable: false,
    configurable: true,
  });
  Object.defineProperty(res, "_status", {
    value: status,
    enumerable: true,
    writable: false,
    configurable: true,
  });

  return res;
}

/**
 * Creates an error TypedResponse helper factory.
 */
function createErrorReply<TStatus extends number>(defaultStatus: TStatus) {
  return function <T = { message: string }, const TInit extends number | ResponseInit = ResponseInit>(
    data?: T,
    init?: TInit,
  ): TypedResponse<T, ExtractStatus<TStatus, TInit>> {
    const status = (typeof init === "number" ? init : init?.status ?? defaultStatus) as ExtractStatus<TStatus, TInit>;
    const bodyPayload = data !== undefined ? data : ({ message: `HTTP ${defaultStatus}` } as unknown as T);

    const headers = new Headers(typeof init === "object" ? init?.headers : undefined);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json; charset=utf-8");
    }

    const res = new Response(JSON.stringify(bodyPayload), {
      ...(typeof init === "object" ? init : {}),
      status,
      headers,
    }) as TypedResponse<T, ExtractStatus<TStatus, TInit>>;

    Object.defineProperty(res, "_data", {
      value: bodyPayload,
      enumerable: true,
      writable: false,
      configurable: true,
    });
    Object.defineProperty(res, "_status", {
      value: status,
      enumerable: true,
      writable: false,
      configurable: true,
    });

    return res;
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

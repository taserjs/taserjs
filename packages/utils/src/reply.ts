export interface TypedResponse<T = unknown, TStatus extends number = number> extends Response {
  readonly _data?: T;
  readonly _status?: TStatus;
  json(): Promise<T>;
}

export type JsonResponse<T = unknown, TStatus extends number = 200> = TypedResponse<T, TStatus>;

export type ExtractStatus<
  TDefault extends number,
  TInit extends number | ResponseInit | undefined,
> = TInit extends number ? TInit : TInit extends { status: infer S extends number } ? S : TDefault;

function defaultJsonHeaders(): Record<string, string> {
  return { "content-type": "application/json; charset=utf-8" };
}

export function createTypedResponse<T, TStatus extends number>(
  body: BodyInit | null | undefined,
  init: number | ResponseInit | undefined,
  defaultStatus: TStatus,
  defaultHeaders?: Record<string, string>,
  dataPayload?: T,
): TypedResponse<T, TStatus> {
  const status = (typeof init === "number" ? init : (init?.status ?? defaultStatus)) as TStatus;

  let headers: HeadersInit | undefined;
  if (init === undefined || typeof init === "number") {
    headers = defaultHeaders;
  } else if (init.headers) {
    const h = new Headers(init.headers);
    if (defaultHeaders) {
      for (const [key, value] of Object.entries(defaultHeaders)) {
        if (!h.has(key)) {
          h.set(key, value);
        }
      }
    }
    headers = h;
  } else {
    headers = defaultHeaders;
  }

  const responseInit: ResponseInit = {
    ...(typeof init === "object" ? init : {}),
    status,
  };
  if (headers !== undefined) {
    responseInit.headers = headers;
  }

  const res = new Response(body, responseInit) as TypedResponse<T, TStatus>;

  (res as any)._data = dataPayload;
  (res as any)._status = status;

  return res;
}

/**
 * Creates a JSON TypedResponse.
 */
export function json<T, const TInit extends number | ResponseInit = ResponseInit>(
  data: T,
  init?: TInit,
): TypedResponse<T, ExtractStatus<200, TInit>> {
  if (init === undefined) {
    const res = new Response(JSON.stringify(data), {
      status: 200,
      headers: defaultJsonHeaders(),
    }) as TypedResponse<T, ExtractStatus<200, TInit>>;
    (res as any)._data = data;
    (res as any)._status = 200;
    return res;
  }

  if (typeof init === "number") {
    const res = new Response(JSON.stringify(data), {
      status: init,
      headers: defaultJsonHeaders(),
    }) as TypedResponse<T, ExtractStatus<200, TInit>>;
    (res as any)._data = data;
    (res as any)._status = init;
    return res;
  }

  const status = (init?.status ?? 200) as ExtractStatus<200, TInit>;
  let headers: HeadersInit;
  if (init.headers) {
    const h = new Headers(init.headers);
    if (!h.has("content-type")) {
      h.set("content-type", "application/json; charset=utf-8");
    }
    headers = h;
  } else {
    headers = defaultJsonHeaders();
  }

  const res = new Response(JSON.stringify(data), {
    ...init,
    status,
    headers,
  }) as TypedResponse<T, ExtractStatus<200, TInit>>;

  (res as any)._data = data;
  (res as any)._status = status;

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
  const status = (typeof init === "number" ? init : (init?.status ?? 302)) as ExtractStatus<
    302,
    TInit
  >;
  const location = typeof url === "string" ? url : url.toString();
  let headers: HeadersInit;
  if (init === undefined || typeof init === "number") {
    headers = { location };
  } else if (init.headers) {
    const h = new Headers(init.headers);
    h.set("location", location);
    headers = h;
  } else {
    headers = { location };
  }

  const res = new Response(null, {
    ...(typeof init === "object" ? init : {}),
    status,
    headers,
  }) as TypedResponse<null, ExtractStatus<302, TInit>>;

  (res as any)._data = null;
  (res as any)._status = status;

  return res;
}

/**
 * Creates an error TypedResponse helper factory.
 */
function createErrorReply<TStatus extends number>(defaultStatus: TStatus) {
  return function <
    T = { message: string },
    const TInit extends number | ResponseInit = ResponseInit,
  >(data?: T, init?: TInit): TypedResponse<T, ExtractStatus<TStatus, TInit>> {
    const status = (
      typeof init === "number" ? init : (init?.status ?? defaultStatus)
    ) as ExtractStatus<TStatus, TInit>;
    const bodyPayload =
      data !== undefined ? data : ({ message: `HTTP ${defaultStatus}` } as unknown as T);

    let headers: HeadersInit;
    if (init === undefined || typeof init === "number") {
      headers = defaultJsonHeaders();
    } else if (init.headers) {
      const h = new Headers(init.headers);
      if (!h.has("content-type")) {
        h.set("content-type", "application/json; charset=utf-8");
      }
      headers = h;
    } else {
      headers = defaultJsonHeaders();
    }

    const res = new Response(JSON.stringify(bodyPayload), {
      ...(typeof init === "object" ? init : {}),
      status,
      headers,
    }) as TypedResponse<T, ExtractStatus<TStatus, TInit>>;

    (res as any)._data = bodyPayload;
    (res as any)._status = status;

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

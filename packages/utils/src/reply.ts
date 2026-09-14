export interface TypedResponse<T = unknown, TStatus extends number = number> extends Response {
  readonly _data?: T;
  readonly _status?: TStatus;
  json(): Promise<T>;
}

export type JsonResponse<T = unknown, TStatus extends number = 200> = TypedResponse<T, TStatus>;

export type ExtractStatus<
  TDefault extends number,
  TInit extends ResponseInit | undefined,
> = TInit extends { status: infer S extends number } ? S : TDefault;

function defaultJsonHeaders(): Record<string, string> {
  return { "content-type": "application/json; charset=utf-8" };
}

export function createTypedResponse<T, TStatus extends number>(
  body: BodyInit | null | undefined,
  init: ResponseInit | undefined,
  defaultStatus: TStatus,
  defaultHeaders?: Record<string, string>,
  dataPayload?: T,
): TypedResponse<T, TStatus> {
  const status = (init?.status ?? defaultStatus) as TStatus;

  let headers: HeadersInit | undefined;
  if (!init || !init.headers) {
    headers = defaultHeaders;
  } else {
    const h = new Headers(init.headers);
    if (defaultHeaders) {
      for (const [key, value] of Object.entries(defaultHeaders)) {
        if (!h.has(key)) {
          h.set(key, value);
        }
      }
    }
    headers = h;
  }

  const responseInit: ResponseInit = {
    ...init,
    status,
    ...(headers !== undefined ? { headers } : {}),
  };

  const res = new Response(body, responseInit) as TypedResponse<T, TStatus>;

  (res as any)._data = dataPayload;
  (res as any)._status = status;

  return res;
}

import { isPlainObjectOrArray } from "./object.js";

export { isPlainObjectOrArray };

/**
 * Creates a generic TypedResponse helper factory with zero default headers and auto-detection.
 */
export function createReply<TStatus extends number>(defaultStatus: TStatus) {
  return function <T = unknown, const TInit extends ResponseInit = ResponseInit>(
    data?: T,
    init?: TInit,
  ): TypedResponse<T, ExtractStatus<TStatus, TInit>> {
    const status = (init?.status ?? defaultStatus) as ExtractStatus<TStatus, TInit>;

    let body: BodyInit | null | undefined;
    let headers = init?.headers;

    if (data === undefined || data === null) {
      body = null;
    } else if (isPlainObjectOrArray(data)) {
      body = JSON.stringify(data);
      if (!headers) {
        headers = { "content-type": "application/json; charset=utf-8" };
      } else {
        const h = new Headers(headers);
        if (!h.has("content-type")) {
          h.set("content-type", "application/json; charset=utf-8");
        }
        headers = h;
      }
    } else {
      body = data as unknown as BodyInit;
    }

    const res = new Response(body, {
      ...init,
      status,
      ...(headers !== undefined ? { headers } : {}),
    }) as TypedResponse<T, ExtractStatus<TStatus, TInit>>;

    (res as any)._data = data;
    (res as any)._status = status;

    return res;
  };
}

/**
 * Creates a JSON TypedResponse defaulting to 200.
 * Always serializes to JSON and sets content-type: application/json; charset=utf-8.
 */
export function json<T, const TInit extends ResponseInit = ResponseInit>(
  data: T,
  init?: TInit,
): TypedResponse<T, ExtractStatus<200, TInit>> {
  const status = (init?.status ?? 200) as ExtractStatus<200, TInit>;
  let headers: HeadersInit;
  if (init?.headers) {
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
 * Creates an HTTP 200 TypedResponse with no default headers (auto-detects plain objects/arrays for JSON).
 */
export const ok = createReply(200);

/**
 * Creates an HTTP 201 TypedResponse with no default headers (auto-detects plain objects/arrays for JSON).
 */
export const created = createReply(201);

/**
 * Creates an HTTP 202 TypedResponse with no default headers (auto-detects plain objects/arrays for JSON).
 */
export const accepted = createReply(202);

/**
 * Creates a noContent (204) TypedResponse with null body and no default headers.
 */
export function noContent<const TInit extends ResponseInit = ResponseInit>(
  init?: TInit,
): TypedResponse<null, ExtractStatus<204, TInit>> {
  const status = (init?.status ?? 204) as ExtractStatus<204, TInit>;
  const res = new Response(null, {
    ...init,
    status,
  }) as TypedResponse<null, ExtractStatus<204, TInit>>;

  (res as any)._data = null;
  (res as any)._status = status;

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
    data,
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
    data,
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
  const location = typeof url === "string" ? url : url.toString();
  let headers: HeadersInit;
  if (!init || !init.headers) {
    headers = { location };
  } else {
    const h = new Headers(init.headers);
    h.set("location", location);
    headers = h;
  }

  const res = new Response(null, {
    ...init,
    status,
    headers,
  }) as TypedResponse<null, ExtractStatus<302, TInit>>;

  (res as any)._data = null;
  (res as any)._status = status;

  return res;
}

export const badRequest = createReply(400);
export const unauthorized = createReply(401);
export const forbidden = createReply(403);
export const notFound = createReply(404);
export const methodNotAllowed = createReply(405);
export const conflict = createReply(409);
export const payloadTooLarge = createReply(413);
export const unprocessable = createReply(422);
export const tooManyRequests = createReply(429);
export const internalServerError = createReply(500);

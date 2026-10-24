import { withDefaultHeaders } from "./headers.js";
import { isPlainObjectOrArray } from "./object.js";

export interface TypedResponse<T = unknown, TStatus extends number = number> extends Response {
  readonly _data?: T;
  readonly _status?: TStatus;
  json(): Promise<T>;
}

export type ExtractStatus<
  TDefault extends number,
  TInit extends ResponseInit | undefined,
> = TInit extends { status: infer S extends number } ? S : TDefault;

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const TEXT_HEADERS = { "content-type": "text/plain; charset=utf-8" };
const HTML_HEADERS = { "content-type": "text/html; charset=utf-8" };

/** Every helper funnels through here so `_data` and `_status` carry the typed payload for clients. */
function typedResponse<T, TStatus extends number>(
  body: BodyInit | null,
  init: ResponseInit | undefined,
  defaultStatus: number,
  headers: HeadersInit | undefined,
  data: T,
): TypedResponse<T, TStatus> {
  const status = init?.status ?? defaultStatus;
  const response = new Response(body, {
    ...init,
    status,
    ...(headers !== undefined ? { headers } : {}),
  }) as TypedResponse<T, TStatus>;

  (response as any)._data = data;
  (response as any)._status = status;

  return response;
}

/** A reply helper that auto-detects JSON for plain objects/arrays and otherwise passes the body through. */
function createReply<TStatus extends number>(defaultStatus: TStatus) {
  return function <T = unknown, const TInit extends ResponseInit = ResponseInit>(
    data?: T,
    init?: TInit,
  ): TypedResponse<T, ExtractStatus<TStatus, TInit>> {
    let body: BodyInit | null;
    let headers: HeadersInit | undefined;

    if (data === undefined || data === null) {
      body = null;
    } else if (isPlainObjectOrArray(data)) {
      body = JSON.stringify(data);
      headers = withDefaultHeaders(init?.headers, JSON_HEADERS);
    } else {
      body = data as BodyInit;
    }

    return typedResponse(body, init, defaultStatus, headers, data as T);
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
  return typedResponse(
    JSON.stringify(data),
    init,
    200,
    withDefaultHeaders(init?.headers, JSON_HEADERS),
    data,
  );
}

/** HTTP 200 with no default headers (auto-detects plain objects/arrays for JSON). */
export const ok = createReply(200);

/** HTTP 201 with no default headers (auto-detects plain objects/arrays for JSON). */
export const created = createReply(201);

/** HTTP 202 with no default headers (auto-detects plain objects/arrays for JSON). */
export const accepted = createReply(202);

/** HTTP 204 with a null body and no default headers. */
export function noContent<const TInit extends ResponseInit = ResponseInit>(
  init?: TInit,
): TypedResponse<null, ExtractStatus<204, TInit>> {
  return typedResponse(null, init, 204, undefined, null);
}

/** Creates a plain text TypedResponse. */
export function text<const TInit extends ResponseInit = ResponseInit>(
  data: string,
  init?: TInit,
): TypedResponse<string, ExtractStatus<200, TInit>> {
  return typedResponse(data, init, 200, withDefaultHeaders(init?.headers, TEXT_HEADERS), data);
}

/** Creates an HTML TypedResponse. */
export function html<const TInit extends ResponseInit = ResponseInit>(
  data: string,
  init?: TInit,
): TypedResponse<string, ExtractStatus<200, TInit>> {
  return typedResponse(data, init, 200, withDefaultHeaders(init?.headers, HTML_HEADERS), data);
}

/** Creates a redirect TypedResponse defaulting to 302. */
export function redirect<const TInit extends ResponseInit = ResponseInit>(
  url: string | URL,
  init?: TInit,
): TypedResponse<null, ExtractStatus<302, TInit>> {
  const location = typeof url === "string" ? url : url.toString();

  let headers: HeadersInit = { location };
  if (init?.headers) {
    headers = new Headers(init.headers);
    headers.set("location", location);
  }

  return typedResponse(null, init, 302, headers, null);
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

import { buildErrorResponse } from "./build.js";
import type { ReplyOf } from "./result.js";
import type { ReplyInit } from "./types.js";

export function badRequest<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<400, T> {
  return buildErrorResponse(body, 400, init) as ReplyOf<400, T>;
}

export function unauthorized<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<401, T> {
  return buildErrorResponse(body, 401, init) as ReplyOf<401, T>;
}

export function forbidden<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<403, T> {
  return buildErrorResponse(body, 403, init) as ReplyOf<403, T>;
}

export function notFound<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<404, T> {
  return buildErrorResponse(body, 404, init) as ReplyOf<404, T>;
}

export function conflict<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<409, T> {
  return buildErrorResponse(body, 409, init) as ReplyOf<409, T>;
}

export function payloadTooLarge<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<413, T> {
  return buildErrorResponse(body, 413, init) as ReplyOf<413, T>;
}

export function unsupportedMediaType<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<415, T> {
  return buildErrorResponse(body, 415, init) as ReplyOf<415, T>;
}

export function unprocessableEntity<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<422, T> {
  return buildErrorResponse(body, 422, init) as ReplyOf<422, T>;
}

export function tooManyRequests<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<429, T> {
  return buildErrorResponse(body, 429, init) as ReplyOf<429, T>;
}

export function internalServerError<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<500, T> {
  return buildErrorResponse(body, 500, init) as ReplyOf<500, T>;
}

export function notImplemented<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<501, T> {
  return buildErrorResponse(body, 501, init) as ReplyOf<501, T>;
}

export function badGateway<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<502, T> {
  return buildErrorResponse(body, 502, init) as ReplyOf<502, T>;
}

export function serviceUnavailable<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<503, T> {
  return buildErrorResponse(body, 503, init) as ReplyOf<503, T>;
}

export function gatewayTimeout<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<504, T> {
  return buildErrorResponse(body, 504, init) as ReplyOf<504, T>;
}

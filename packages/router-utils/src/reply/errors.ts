import { buildErrorResponse } from "./build.js";
import type { ReplyOf } from "./result.js";
import type { ReplyInit } from "./types.js";

export const errorReply = {
  badRequest<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<400, T> {
    return buildErrorResponse(body, 400, init) as ReplyOf<400, T>;
  },

  unauthorized<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<401, T> {
    return buildErrorResponse(body, 401, init) as ReplyOf<401, T>;
  },

  forbidden<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<403, T> {
    return buildErrorResponse(body, 403, init) as ReplyOf<403, T>;
  },

  notFound<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<404, T> {
    return buildErrorResponse(body, 404, init) as ReplyOf<404, T>;
  },

  conflict<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<409, T> {
    return buildErrorResponse(body, 409, init) as ReplyOf<409, T>;
  },

  payloadTooLarge<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<413, T> {
    return buildErrorResponse(body, 413, init) as ReplyOf<413, T>;
  },

  unsupportedMediaType<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<415, T> {
    return buildErrorResponse(body, 415, init) as ReplyOf<415, T>;
  },

  unprocessableEntity<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<422, T> {
    return buildErrorResponse(body, 422, init) as ReplyOf<422, T>;
  },

  tooManyRequests<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<429, T> {
    return buildErrorResponse(body, 429, init) as ReplyOf<429, T>;
  },

  internalServerError<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<500, T> {
    return buildErrorResponse(body, 500, init) as ReplyOf<500, T>;
  },

  notImplemented<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<501, T> {
    return buildErrorResponse(body, 501, init) as ReplyOf<501, T>;
  },

  badGateway<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<502, T> {
    return buildErrorResponse(body, 502, init) as ReplyOf<502, T>;
  },

  serviceUnavailable<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<503, T> {
    return buildErrorResponse(body, 503, init) as ReplyOf<503, T>;
  },

  gatewayTimeout<T = unknown>(body?: T, init?: ReplyInit): ReplyOf<504, T> {
    return buildErrorResponse(body, 504, init) as ReplyOf<504, T>;
  },
};

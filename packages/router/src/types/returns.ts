import type { ReplyOf } from "@taserjs/router-utils";

import type { Simplify } from "./type-utils.js";
import type { Schema } from "./schema.js";
import type { InferOutput } from "./schema.js";

/**
 * Known HTTP status codes. `number & {}` allows custom codes while keeping
 * literal autocomplete / inference for well-known values.
 */
export type StatusCode =
  | 100
  | 101
  | 102
  | 103
  | 200
  | 201
  | 202
  | 203
  | 204
  | 205
  | 206
  | 207
  | 208
  | 226
  | 300
  | 301
  | 302
  | 303
  | 304
  | 305
  | 306
  | 307
  | 308
  | 400
  | 401
  | 402
  | 403
  | 404
  | 405
  | 406
  | 407
  | 408
  | 409
  | 410
  | 411
  | 412
  | 413
  | 414
  | 415
  | 416
  | 417
  | 418
  | 421
  | 422
  | 423
  | 424
  | 425
  | 426
  | 428
  | 429
  | 431
  | 451
  | 500
  | 501
  | 502
  | 503
  | 504
  | 505
  | 506
  | 507
  | 508
  | 510
  | 511
  | (number & {});

/** Status-code → Standard Schema map for route/middleware/handler outputs. */
export type ReturnsMap = {
  readonly [K in StatusCode]?: Schema<unknown>;
};

/** Later map wins on overlapping status keys. */
export type MergeReturns<A extends ReturnsMap, B extends ReturnsMap> = Omit<A, keyof B> & B;

/** Typed reply union for statuses declared in a returns map. */
export type ReplyFor<M extends ReturnsMap> = {
  [S in keyof M]-?: S extends StatusCode
    ? M[S] extends Schema<unknown>
      ? ReplyOf<S, Simplify<InferOutput<M[S]>>>
      : never
    : never;
}[keyof M];

export type EmptyReturns = {};

/** True when no status schemas have been declared yet. */
export type HasReturns<M extends ReturnsMap> = [keyof M] extends [never] ? false : true;

/**
 * Validate a concrete reply `R` against returns map `M`.
 * Declared statuses must match schema output; undeclared statuses stay open
 * (same rule as runtime `validateReply`).
 */
export type ValidHandlerReply<R, M extends ReturnsMap> =
  R extends ReplyOf<infer S, infer B>
    ? S extends keyof M
      ? M[S] extends Schema<unknown>
        ? B extends Simplify<InferOutput<M[S]>>
          ? R
          : never
        : R
      : R
    : R extends Response
      ? R
      : never;

/**
 * Narrow a handler return so declared statuses are schema-checked without
 * breaking multi-status unions (avoids circular `R extends …<R>` constraints).
 */
export type EnforceHandlerReply<R, M extends ReturnsMap> = [R] extends [ValidHandlerReply<R, M>]
  ? R
  : ValidHandlerReply<R, M>;

/**
 * Expected `.handler` return type for a returns map.
 * Prefer constraining handler generics with {@link EnforceHandlerReply}.
 */
export type HandlerReply<M extends ReturnsMap> =
  HasReturns<M> extends true ? ReplyFor<M> | Response : Response;

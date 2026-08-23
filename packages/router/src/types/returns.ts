import type { ReplyOf } from "@taserjs/router-utils/reply";
import type { StatusCode } from "@taserjs/router-utils";

import type { Simplify } from "./type-utils.js";
import type { Schema } from "./schema.js";
import type { InferOutput } from "./schema.js";

export type { StatusCode };

/** Status-code → Standard Schema map for route/middleware/handler outputs. */
export type ReturnsMap = {
  readonly [status: number]: Schema<unknown> | undefined;
};

/** Later map wins on overlapping status keys. */
export type MergeReturns<A extends ReturnsMap, B extends ReturnsMap> = Omit<A, keyof B> & B;

/** Typed reply union for statuses declared in a returns map. */
export type ReplyFor<M extends ReturnsMap> = {
  [S in keyof M & number]: M[S] extends Schema<unknown>
    ? ReplyOf<S, Simplify<InferOutput<M[S]>>>
    : never;
}[keyof M & number];

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

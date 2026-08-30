import type { TaserCookieJar, TaserHeaders } from "@taserjs/router-core";
import type { HttpMethod, HttpVerb } from "@taserjs/router-utils/http";

export type Method = HttpMethod;
export type { HttpMethod, HttpVerb };

export type MiddlewareFieldName = "query" | "params" | "body" | "state";

export type MiddlewareInputFieldName = "query" | "params" | "body";

export type UnwrapPart<T> = unknown extends T ? {} : T;

export type MergePart<T, Base> = unknown extends T ? Base : Base & T;

/** Collapse intersections so `Omit`/`keyof` treat the result as one object type. */
export type Simplify<T> = { [K in keyof T]: T[K] } & {};

/**
 * Request prop: when schema input is `unknown` (e.g. zod coerce),
 * fall back to the validated output type.
 */
type RequestPropType<TIn, TOut> = [unknown] extends [Exclude<TIn, undefined>] ? TOut : TIn;

/**
 * Pre-parse request shape. Prefer input types (defaults → optional),
 * but replace `unknown` input props with output types.
 */
export type RequestShape<TIn, TOut> = unknown extends TIn
  ? UnwrapPart<TOut>
  : Simplify<{
      [K in keyof TIn]: K extends keyof TOut ? RequestPropType<TIn[K], TOut[K]> : TIn[K];
    }>;

export type UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (
  value: infer Value,
) => void
  ? Value
  : never;

export type MiddlewareField<Middleware, Field extends MiddlewareFieldName> = Field extends "query"
  ? Middleware extends { query: infer Query }
    ? Query
    : {}
  : Field extends "params"
    ? Middleware extends { params: infer Params }
      ? Params
      : {}
    : Field extends "body"
      ? Middleware extends { body: infer Body }
        ? Body
        : {}
      : Field extends "state"
        ? Middleware extends { state: infer State }
          ? State
          : {}
        : {};

export type MiddlewareInputField<
  Middleware,
  Field extends MiddlewareInputFieldName,
> = Middleware extends { input: { [K in Field]: infer V } } ? V : {};

export type MergeMiddlewareField<
  Middlewares extends readonly unknown[],
  Field extends MiddlewareFieldName,
> = Middlewares extends readonly []
  ? {}
  : Middlewares extends readonly [infer Head, ...infer Tail]
    ? MiddlewareField<Head, Field> & MergeMiddlewareField<Tail, Field>
    : MiddlewareField<Middlewares[number], Field>;

export type MergeMiddlewareInputField<
  Middlewares extends readonly unknown[],
  Field extends MiddlewareInputFieldName,
> = Middlewares extends readonly []
  ? {}
  : Middlewares extends readonly [infer Head, ...infer Tail]
    ? MiddlewareInputField<Head, Field> & MergeMiddlewareInputField<Tail, Field>
    : MiddlewareInputField<Middlewares[number], Field>;

export type RuntimeContextFields = {
  request: Request;
  method: Method;
  url: URL;
  headers: TaserHeaders;
  cookies: TaserCookieJar;
  var: Record<string, unknown>;
};

export type UnitRuntimeContext = Omit<RuntimeContextFields, "var">;

import type { Awaitable, TaserCookieJar, TaserHeaders } from "@taserjs/router-core";
import type { ReplyResult } from "@taserjs/router-utils";

import type { RouterRegister } from "../register.js";
import type {
  MergeMiddlewareField,
  MergePart,
  RequestShape,
  RuntimeContextFields,
  Simplify,
  UnwrapPart,
} from "./type-utils.js";
import type { ReturnsMap } from "./returns.js";
import type { Schema } from "./schema.js";

export type { HttpMethod, Method } from "./type-utils.js";
export type {
  EmptyReturns,
  MergeReturns,
  ReturnsMap,
  HandlerReply,
  HasReturns,
  StatusCode,
  ValidHandlerReply,
  EnforceHandlerReply,
} from "./returns.js";

/** Default empty app context for standalone units without a bound router instance. */
export type AppContext = Record<never, never>;

export type NativeContext = RouterRegister extends { NativeContext: infer N } ? N : unknown;

export type ValidatorParts = {
  query?: unknown;
  params?: unknown;
  body?: unknown;
  queryIn?: unknown;
  paramsIn?: unknown;
  bodyIn?: unknown;
};

export declare const StateBrand: unique symbol;

export type NextResult<TState = unknown> = ReplyResult & {
  readonly [StateBrand]?: TState;
};

export type ExtractState<T> = [Extract<Awaited<T>, { [StateBrand]?: unknown }>] extends [never]
  ? {}
  : Extract<Awaited<T>, { [StateBrand]?: unknown }> extends { [StateBrand]?: infer S }
    ? [S] extends [never]
      ? {}
      : S
    : {};

export type IsUnknown<T> = [unknown] extends [T] ? true : false;

export type NextFn<TExpectedState = unknown> =
  IsUnknown<TExpectedState> extends true
    ? <S extends Record<string, unknown> = {}>(state?: S) => Promise<NextResult<S>>
    : (state: TExpectedState) => Promise<NextResult<TExpectedState>>;

export type MiddlewareNext = NextFn;

export type MiddlewareDefinition = {
  query?: unknown;
  params?: unknown;
  body?: unknown;
  returns?: ReturnsMap;
  handler: (ctx: unknown, next: MiddlewareNext) => Awaitable<ReplyResult | Response | unknown>;
};

export type MiddlewareReturnFromParts<
  TQuery,
  TParams,
  TBody,
  TState,
  TQueryIn = TQuery,
  TParamsIn = TParams,
  TBodyIn = TBody,
> = {
  query: Simplify<UnwrapPart<TQuery>>;
  params: Simplify<UnwrapPart<TParams>>;
  body: Simplify<UnwrapPart<TBody>>;
  state: Simplify<UnwrapPart<TState>>;
  /** Pre-parse shapes merged into route `$Infer.Input`. */
  input: {
    query: RequestShape<TQueryIn, TQuery>;
    params: RequestShape<TParamsIn, TParams>;
    body: RequestShape<TBodyIn, TBody>;
  };
};

type UnitRuntimeContext = Omit<RuntimeContextFields<NativeContext>, "var">;

export type StandaloneMiddlewareContext<
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
  TAppContext extends Record<string, unknown> = AppContext,
> = Simplify<
  TAppContext &
    UnitRuntimeContext & {
      query: Simplify<UnwrapPart<TQuery>>;
      params: Simplify<UnwrapPart<TParams>>;
      body: Simplify<UnwrapPart<TBody>>;
      state: {};
      headers: TaserHeaders;
      cookies: TaserCookieJar;
    }
>;

export type HandlerContext<
  Acc extends readonly unknown[],
  Validators extends ValidatorParts,
  TAppContext extends Record<string, unknown> = AppContext,
> = Simplify<
  TAppContext &
    UnitRuntimeContext & {
      query: Simplify<
        MergePart<
          Validators extends { query?: infer Q } ? Q : unknown,
          MergeMiddlewareField<Acc, "query">
        >
      >;
      params: Simplify<
        MergePart<
          Validators extends { params?: infer P } ? P : unknown,
          MergeMiddlewareField<Acc, "params">
        >
      >;
      body: Simplify<
        MergePart<
          Validators extends { body?: infer B } ? B : unknown,
          MergeMiddlewareField<Acc, "body">
        >
      >;
      state: Simplify<MergeMiddlewareField<Acc, "state">>;
      headers: TaserHeaders;
      cookies: TaserCookieJar;
    }
>;

export type MiddlewareUnit<
  TAcc = unknown,
  TReturns extends ReturnsMap = {},
> = MiddlewareDefinition & {
  readonly __middlewareAcc: TAcc;
  readonly __returns?: TReturns;
};

export type HandlerUnit<
  _Acc extends readonly unknown[],
  _Validators extends ValidatorParts,
  TReturns extends ReturnsMap = {},
  TOutput = Response,
> = {
  readonly __returns?: TReturns;
  readonly $Infer: {
    Output: TOutput;
  };
  middlewares: readonly MiddlewareDefinition[];
  handler: (ctx: unknown) => Awaitable<ReplyResult | Response>;
  returns?: ReturnsMap;
  query?: Schema<unknown>;
  params?: Schema<unknown>;
  body?: Schema<unknown>;
};

export type InlineMiddlewareOptions<
  Ctx = unknown,
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
  TReturns extends ReturnsMap = {},
  TQueryIn = unknown,
  TParamsIn = unknown,
  TBodyIn = unknown,
  R = unknown,
> = {
  query?: Schema<TQuery, TQueryIn>;
  params?: Schema<TParams, TParamsIn>;
  body?: Schema<TBody, TBodyIn>;
  returns?: TReturns;
  handler: (ctx: Ctx, next: NextFn) => Awaitable<R>;
};

export function isHandlerUnit(
  value: unknown,
): value is HandlerUnit<readonly unknown[], ValidatorParts> {
  return (
    typeof value === "object" &&
    value !== null &&
    "handler" in value &&
    "middlewares" in value &&
    Array.isArray((value as HandlerUnit<readonly unknown[], ValidatorParts>).middlewares)
  );
}

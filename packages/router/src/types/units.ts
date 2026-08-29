import type {
  Awaitable,
  MiddlewareDefinition as CoreMiddlewareDefinition,
  TaserCookieJar,
  TaserHeaders,
} from "@taserjs/router-core";

import type { RequestShape, Simplify, UnitRuntimeContext, UnwrapPart } from "./type-utils.js";
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

export type ValidatorParts = {
  query?: unknown;
  params?: unknown;
  body?: unknown;
  queryIn?: unknown;
  paramsIn?: unknown;
  bodyIn?: unknown;
};

export declare const StateBrand: unique symbol;

export type NextResult<TState = unknown> = Response & {
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

export type MiddlewareDefinition = CoreMiddlewareDefinition<ReturnsMap>;

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

export type DefineMiddlewareResult<
  TQuery,
  TParams,
  TBody,
  TState,
  R,
  TQueryIn = TQuery,
  TParamsIn = TParams,
  TBodyIn = TBody,
  TReturns extends ReturnsMap = {},
  TLayout = null,
  TRequires = {},
> = MiddlewareUnit<
  MiddlewareReturnFromParts<
    TQuery,
    TParams,
    TBody,
    IsUnknown<TState> extends true ? ExtractState<R> : TState,
    TQueryIn,
    TParamsIn,
    TBodyIn
  >,
  TReturns,
  TLayout,
  TRequires
>;

export type StandaloneMiddlewareContext<
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
  TAppContext extends Record<string, unknown> = AppContext,
  TState = {},
> = Simplify<
  TAppContext &
    UnitRuntimeContext & {
      query: Simplify<UnwrapPart<TQuery>>;
      params: Simplify<UnwrapPart<TParams>>;
      body: Simplify<UnwrapPart<TBody>>;
      state: Simplify<UnwrapPart<TState>>;
      headers: TaserHeaders;
      cookies: TaserCookieJar;
    }
>;

export type MiddlewareUnit<
  TAcc = unknown,
  TReturns extends ReturnsMap = {},
  TRequiredLayouts = unknown,
  TRequiredState = unknown,
> = MiddlewareDefinition & {
  readonly __middlewareAcc: TAcc;
  readonly __returns?: TReturns;
  readonly __requiredLayouts?: TRequiredLayouts;
  readonly __requiredState?: TRequiredState;
};

export type MiddlewareUnitBuilder<
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
  TReturns extends ReturnsMap = {},
  TRequiredLayouts = unknown,
  TRequiredState = {},
  TAppContext extends Record<string, unknown> = AppContext,
  TInheritedState = {},
  TQueryIn = unknown,
  TParamsIn = unknown,
  TBodyIn = unknown,
> = {
  query<Q, QIn = unknown>(
    schema: Schema<Q, QIn>,
  ): MiddlewareUnitBuilder<
    Q,
    TParams,
    TBody,
    TReturns,
    TRequiredLayouts,
    TRequiredState,
    TAppContext,
    TInheritedState,
    QIn,
    TParamsIn,
    TBodyIn
  >;
  params<P, PIn = unknown>(
    schema: Schema<P, PIn>,
  ): MiddlewareUnitBuilder<
    TQuery,
    P,
    TBody,
    TReturns,
    TRequiredLayouts,
    TRequiredState,
    TAppContext,
    TInheritedState,
    TQueryIn,
    PIn,
    TBodyIn
  >;
  body<B, BIn = unknown>(
    schema: Schema<B, BIn>,
  ): MiddlewareUnitBuilder<
    TQuery,
    TParams,
    B,
    TReturns,
    TRequiredLayouts,
    TRequiredState,
    TAppContext,
    TInheritedState,
    TQueryIn,
    TParamsIn,
    BIn
  >;
  body<Mode extends "json" | "form" | "urlencoded", B, BIn = unknown>(
    mode: Mode,
    schema: Schema<B, BIn>,
  ): MiddlewareUnitBuilder<
    TQuery,
    TParams,
    B,
    TReturns,
    TRequiredLayouts,
    TRequiredState,
    TAppContext,
    TInheritedState,
    TQueryIn,
    TParamsIn,
    BIn
  >;
  returns<const M extends ReturnsMap>(
    map: M,
  ): MiddlewareUnitBuilder<
    TQuery,
    TParams,
    TBody,
    Omit<TReturns, keyof M> & M,
    TRequiredLayouts,
    TRequiredState,
    TAppContext,
    TInheritedState,
    TQueryIn,
    TParamsIn,
    TBodyIn
  >;
  requires<Requires extends Record<string, unknown>>(): MiddlewareUnitBuilder<
    TQuery,
    TParams,
    TBody,
    TReturns,
    TRequiredLayouts,
    TRequiredState & Requires,
    TAppContext,
    TInheritedState,
    TQueryIn,
    TParamsIn,
    TBodyIn
  >;
  handler<TState = unknown, R = unknown>(
    fn: (
      ctx: StandaloneMiddlewareContext<
        TQuery,
        TParams,
        TBody,
        TAppContext,
        TInheritedState & TRequiredState
      >,
      next: NextFn<NoInfer<TState>>,
    ) => Awaitable<R>,
  ): DefineMiddlewareResult<
    TQuery,
    TParams,
    TBody,
    TState,
    R,
    TQueryIn,
    TParamsIn,
    TBodyIn,
    TReturns,
    TRequiredLayouts,
    TRequiredState
  >;
};

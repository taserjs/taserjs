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
export type EmptyAppContext = Record<never, never>;

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

export type ExtractStateFromUnion<T> = T extends { readonly [StateBrand]?: infer S }
  ? [S] extends [never]
    ? never
    : [unknown] extends [S]
      ? {}
      : S
  : never;

export type ExtractState<T> = [ExtractStateFromUnion<Awaited<T>>] extends [never]
  ? {}
  : ExtractStateFromUnion<Awaited<T>>;

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
  TAppContext extends Record<string, unknown> = EmptyAppContext,
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

export declare const MiddlewareUnitBrand: unique symbol;

export type MiddlewareUnit<
  TAcc = unknown,
  TReturns extends ReturnsMap = {},
  TRequiredLayouts = unknown,
  TRequiredState = unknown,
> = MiddlewareDefinition & {
  readonly [MiddlewareUnitBrand]: true;
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
  TAppContext extends Record<string, unknown> = EmptyAppContext,
  TInheritedState = {},
  TQueryIn = unknown,
  TParamsIn = unknown,
  TBodyIn = unknown,
  TExpectedState = unknown,
> = MiddlewareUnit<
  MiddlewareReturnFromParts<
    TQuery,
    TParams,
    TBody,
    IsUnknown<TExpectedState> extends true ? {} : TExpectedState,
    TQueryIn,
    TParamsIn,
    TBodyIn
  >,
  TReturns,
  TRequiredLayouts,
  TRequiredState
> & {
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
    TBodyIn,
    TExpectedState
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
    TBodyIn,
    TExpectedState
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
    BIn,
    TExpectedState
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
    BIn,
    TExpectedState
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
    TBodyIn,
    TExpectedState
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
    TBodyIn,
    TExpectedState
  >;
  handler<R>(
    fn: (
      ctx: StandaloneMiddlewareContext<
        TQuery,
        TParams,
        TBody,
        TAppContext,
        TInheritedState & TRequiredState
      >,
      next: NextFn<TExpectedState>,
    ) => R,
  ): DefineMiddlewareResult<
    TQuery,
    TParams,
    TBody,
    IsUnknown<TExpectedState> extends true ? ExtractState<R> : TExpectedState,
    R,
    TQueryIn,
    TParamsIn,
    TBodyIn,
    TReturns,
    TRequiredLayouts,
    TRequiredState
  >;
  handle<R>(
    fn: (
      ctx: StandaloneMiddlewareContext<
        TQuery,
        TParams,
        TBody,
        TAppContext,
        TInheritedState & TRequiredState
      >,
      next: NextFn<TExpectedState>,
    ) => R,
  ): DefineMiddlewareResult<
    TQuery,
    TParams,
    TBody,
    IsUnknown<TExpectedState> extends true ? ExtractState<R> : TExpectedState,
    R,
    TQueryIn,
    TParamsIn,
    TBodyIn,
    TReturns,
    TRequiredLayouts,
    TRequiredState
  >;
};

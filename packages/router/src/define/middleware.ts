import { createTaserCompatHandler, type Awaitable } from "@taserjs/router-core";

import type { ReturnsMap } from "../types/returns.js";
import type {
  AppContext,
  ExtractState,
  IsUnknown,
  MiddlewareReturnFromParts,
  MiddlewareUnit,
  NextFn,
  StandaloneMiddlewareContext,
} from "../types/units.js";
import type {
  LayoutId,
  ResolveLayoutMiddlewaresState,
  ResolveLayoutsState,
} from "../types/index.js";
import type { Schema } from "../types/schema.js";

type HonoMiddlewareHandler = Parameters<typeof createTaserCompatHandler>[0];

type HonoMiddlewareUnit = MiddlewareUnit<
  MiddlewareReturnFromParts<unknown, unknown, unknown, {}>,
  {},
  null,
  {}
>;

export type DefineMiddlewareOptions<
  TState = unknown,
  TRequires = {},
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
  TReturns extends ReturnsMap = {},
  TQueryIn = unknown,
  TParamsIn = unknown,
  TBodyIn = unknown,
  TAppContext extends Record<string, unknown> = AppContext,
  R = unknown,
> = {
  query?: Schema<TQuery, TQueryIn>;
  params?: Schema<TParams, TParamsIn>;
  body?: Schema<TBody, TBodyIn>;
  returns?: TReturns;
  handler: (
    ctx: StandaloneMiddlewareContext<TQuery, TParams, TBody, TAppContext, TRequires>,
    next: NextFn<NoInfer<TState>>,
  ) => Awaitable<R>;
};

export type ScopedMiddlewareOptions<
  Layout extends LayoutId,
  TState = unknown,
  TRequires = {},
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
  TReturns extends ReturnsMap = {},
  TQueryIn = unknown,
  TParamsIn = unknown,
  TBodyIn = unknown,
  TAppContext extends Record<string, unknown> = AppContext,
  R = unknown,
> = {
  query?: Schema<TQuery, TQueryIn>;
  params?: Schema<TParams, TParamsIn>;
  body?: Schema<TBody, TBodyIn>;
  returns?: TReturns;
  handler: (
    ctx: StandaloneMiddlewareContext<
      TQuery,
      TParams,
      TBody,
      TAppContext,
      ResolveLayoutMiddlewaresState<Layout> & TRequires
    >,
    next: NextFn<NoInfer<TState>>,
  ) => Awaitable<R>;
};

export type MultiScopedMiddlewareOptions<
  Layouts extends readonly LayoutId[],
  TState = unknown,
  TRequires = {},
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
  TReturns extends ReturnsMap = {},
  TQueryIn = unknown,
  TParamsIn = unknown,
  TBodyIn = unknown,
  TAppContext extends Record<string, unknown> = AppContext,
  R = unknown,
> = {
  query?: Schema<TQuery, TQueryIn>;
  params?: Schema<TParams, TParamsIn>;
  body?: Schema<TBody, TBodyIn>;
  returns?: TReturns;
  handler: (
    ctx: StandaloneMiddlewareContext<
      TQuery,
      TParams,
      TBody,
      TAppContext,
      ResolveLayoutsState<Layouts> & TRequires
    >,
    next: NextFn<NoInfer<TState>>,
  ) => Awaitable<R>;
};

export function defineMiddleware(middleware: HonoMiddlewareHandler): HonoMiddlewareUnit;

export function defineMiddleware<
  const Layout extends LayoutId,
  TState = unknown,
  TRequires = {},
  TAppContext extends Record<string, unknown> = AppContext,
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
  TReturns extends ReturnsMap = {},
  TQueryIn = unknown,
  TParamsIn = unknown,
  TBodyIn = unknown,
  R = unknown,
>(
  layout: Layout,
  options: ScopedMiddlewareOptions<
    Layout,
    TState,
    TRequires,
    TQuery,
    TParams,
    TBody,
    TReturns,
    TQueryIn,
    TParamsIn,
    TBodyIn,
    TAppContext,
    R
  >,
): MiddlewareUnit<
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
  Layout,
  TRequires
>;

export function defineMiddleware<
  const Layouts extends readonly [LayoutId, ...LayoutId[]],
  TState = unknown,
  TRequires = {},
  TAppContext extends Record<string, unknown> = AppContext,
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
  TReturns extends ReturnsMap = {},
  TQueryIn = unknown,
  TParamsIn = unknown,
  TBodyIn = unknown,
  R = unknown,
>(
  layouts: Layouts,
  options: MultiScopedMiddlewareOptions<
    Layouts,
    TState,
    TRequires,
    TQuery,
    TParams,
    TBody,
    TReturns,
    TQueryIn,
    TParamsIn,
    TBodyIn,
    TAppContext,
    R
  >,
): MiddlewareUnit<
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
  Layouts,
  TRequires
>;

export function defineMiddleware<
  TState = unknown,
  TRequires = {},
  TAppContext extends Record<string, unknown> = AppContext,
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
  TReturns extends ReturnsMap = {},
  TQueryIn = unknown,
  TParamsIn = unknown,
  TBodyIn = unknown,
  R = unknown,
>(
  options: DefineMiddlewareOptions<
    TState,
    TRequires,
    TQuery,
    TParams,
    TBody,
    TReturns,
    TQueryIn,
    TParamsIn,
    TBodyIn,
    TAppContext,
    R
  >,
): MiddlewareUnit<
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
  null,
  TRequires
>;

export function defineMiddleware(
  first:
    | string
    | readonly string[]
    | HonoMiddlewareHandler
    | DefineMiddlewareOptions<any, any, any, any, any, any, any, any, any, any, any>,
  second?: DefineMiddlewareOptions<any, any, any, any, any, any, any, any, any, any, any>,
): unknown {
  if (typeof first === "string" || Array.isArray(first)) {
    const options = second!;
    const unit = {
      ...options,
      __middlewareAcc: undefined as unknown,
      ...(options?.returns ? { __returns: options.returns } : {}),
      __requiredLayouts: first,
    };
    return unit;
  }

  if (typeof first === "function") {
    const honoMiddleware = first as HonoMiddlewareHandler;
    return defineMiddleware({
      handler: (ctx, next) => createTaserCompatHandler(honoMiddleware)(ctx, next),
    });
  }

  const options = first as DefineMiddlewareOptions<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >;
  const unit = {
    ...options,
    __middlewareAcc: undefined as unknown,
    ...(options.returns ? { __returns: options.returns } : {}),
  };

  return unit;
}

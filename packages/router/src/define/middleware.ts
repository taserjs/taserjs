import { createTaserCompatHandler, type Awaitable } from "@taserjs/router-core";

import type { ReturnsMap } from "../types/returns.js";
import type {
  AppContext,
  DefineMiddlewareResult,
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

export type HonoMiddlewareHandler = Parameters<typeof createTaserCompatHandler>[0];

export type HonoMiddlewareUnit = MiddlewareUnit<
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

export interface DefineMiddlewareFn<TAppContext extends Record<string, unknown> = AppContext> {
  (middleware: HonoMiddlewareHandler): HonoMiddlewareUnit;

  <
    const Layout extends LayoutId,
    TState = unknown,
    TRequires = {},
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
    Layout,
    TRequires
  >;

  <
    const Layouts extends readonly [LayoutId, ...LayoutId[]],
    TState = unknown,
    TRequires = {},
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
    Layouts,
    TRequires
  >;

  <
    TState = unknown,
    TRequires = {},
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
    null,
    TRequires
  >;
}

export const defineMiddleware: DefineMiddlewareFn<AppContext> = function defineMiddleware(
  first: any,
  second?: any,
): any {
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
      handler: (ctx: unknown, next: (state?: Record<string, unknown>) => unknown) =>
        createTaserCompatHandler(honoMiddleware)(ctx, next),
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
};

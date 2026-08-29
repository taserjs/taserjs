import { type Awaitable } from "@taserjs/router-core";

import type { ReturnsMap } from "../types/returns.js";
import type {
  AppContext,
  DefineMiddlewareResult,
  ExtractState,
  IsUnknown,
  NextFn,
  StandaloneMiddlewareContext,
} from "../types/units.js";
import type {
  LayoutId,
  ResolveLayoutMiddlewaresState,
  ResolveLayoutsState,
} from "../types/index.js";
import type { Schema } from "../types/schema.js";

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
  /**
   * Defines a standalone middleware scoped to a single layout branch using a short function signature.
   */
  <const Layout extends LayoutId, TState = unknown, TRequires = {}, R = unknown>(
    layout: Layout,
    fn: (
      ctx: StandaloneMiddlewareContext<
        unknown,
        unknown,
        unknown,
        TAppContext,
        ResolveLayoutMiddlewaresState<Layout> & TRequires
      >,
      next: NextFn<NoInfer<TState>>,
    ) => Awaitable<R>,
  ): DefineMiddlewareResult<
    unknown,
    unknown,
    unknown,
    IsUnknown<TState> extends true ? ExtractState<R> : TState,
    R,
    unknown,
    unknown,
    unknown,
    {},
    Layout,
    TRequires
  >;

  /**
   * Defines a standalone middleware scoped to a single layout branch.
   */
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

  /**
   * Defines a standalone middleware scoped to multiple layout branches using a short function signature.
   */
  <
    const Layouts extends readonly [LayoutId, ...LayoutId[]],
    TState = unknown,
    TRequires = {},
    R = unknown,
  >(
    layouts: Layouts,
    fn: (
      ctx: StandaloneMiddlewareContext<
        unknown,
        unknown,
        unknown,
        TAppContext,
        ResolveLayoutsState<Layouts> & TRequires
      >,
      next: NextFn<NoInfer<TState>>,
    ) => Awaitable<R>,
  ): DefineMiddlewareResult<
    unknown,
    unknown,
    unknown,
    IsUnknown<TState> extends true ? ExtractState<R> : TState,
    R,
    unknown,
    unknown,
    unknown,
    {},
    Layouts,
    TRequires
  >;

  /**
   * Defines a standalone middleware scoped to multiple layout branches (branch union).
   */
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

  /**
   * Defines a standalone, unscoped middleware using a short function signature.
   *
   * @example
   * ```ts
   * const auth = defineMiddleware((ctx, next) => {
   *   return next({ user: "alice" });
   * });
   * ```
   */
  <TState = unknown, TRequires = {}, R = unknown>(
    fn: (
      ctx: StandaloneMiddlewareContext<unknown, unknown, unknown, TAppContext, TRequires>,
      next: NextFn<NoInfer<TState>>,
    ) => Awaitable<R>,
  ): DefineMiddlewareResult<
    unknown,
    unknown,
    unknown,
    IsUnknown<TState> extends true ? ExtractState<R> : TState,
    R,
    unknown,
    unknown,
    unknown,
    {},
    null,
    TRequires
  >;

  /**
   * Defines a standalone, unscoped middleware with optional produced state (`TState`) and required upstream state (`TRequires`).
   */
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
    if (typeof second === "function") {
      return {
        handler: second,
        __middlewareAcc: undefined as unknown,
        __requiredLayouts: first,
      };
    }
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
    return {
      handler: first,
      __middlewareAcc: undefined as unknown,
    };
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

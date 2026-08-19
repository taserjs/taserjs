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
import type { Schema } from "../types/schema.js";

type HonoMiddlewareHandler = Parameters<typeof createTaserCompatHandler>[0];

type HonoMiddlewareUnit = MiddlewareUnit<MiddlewareReturnFromParts<unknown, unknown, unknown, {}>>;

export type DefineMiddlewareOptions<
  TState = unknown,
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
    ctx: StandaloneMiddlewareContext<TQuery, TParams, TBody, TAppContext>,
    next: NextFn<NoInfer<TState>>,
  ) => Awaitable<R>;
};

export function defineMiddleware(middleware: HonoMiddlewareHandler): HonoMiddlewareUnit;

export function defineMiddleware<
  TState = unknown,
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
  TReturns
>;

export function defineMiddleware(
  options:
    | HonoMiddlewareHandler
    | DefineMiddlewareOptions<any, any, any, any, any, any, any, any, any, any>,
): unknown {
  if (typeof options === "function") {
    const honoMiddleware = options as HonoMiddlewareHandler;
    return defineMiddleware({
      handler: (ctx, next) => createTaserCompatHandler(honoMiddleware)(ctx, next),
    });
  }

  const unit = {
    ...options,
    __middlewareAcc: undefined as unknown,
    ...(options.returns ? { __returns: options.returns } : {}),
  };

  return unit;
}

import type { ReplyResult } from '@taserjs/router-utils'
import { createTaserCompatHandler } from '@taserjs/router-core'

import type { Awaitable, ReturnsMap } from '../types/index.js'
import type {
  AppContext,
  MiddlewareReturnFromParts,
  MiddlewareUnit,
  StandaloneMiddlewareContext,
} from '../types/units.js'
import type { Schema } from '../types/schema.js'

type HonoMiddlewareHandler = Parameters<typeof createTaserCompatHandler>[0]

type HonoMiddlewareUnit = MiddlewareUnit<
  MiddlewareReturnFromParts<unknown, unknown, unknown, {}>
>

type MiddlewareBuilderState<
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
  TState = unknown,
  TCtx = unknown,
  TReturns extends ReturnsMap = {},
> = {
  state?: Schema<TState>
  ctx?: Schema<TCtx>
  query?: Schema<TQuery>
  params?: Schema<TParams>
  body?: Schema<TBody>
  returns?: TReturns
}

type FluentNext<TState, TCtx>
  = [TState] extends [undefined]
    ? [TCtx] extends [undefined]
        ? () => Promise<ReplyResult>
        : (args: { ctx: TCtx }) => Promise<ReplyResult>
    : [TCtx] extends [undefined]
        ? (args: { state: TState }) => Promise<ReplyResult>
        : (args: { state: TState, ctx: TCtx }) => Promise<ReplyResult>

type FluentMiddlewareBuilder<
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
  TState = undefined,
  TCtx = undefined,
  TReturns extends ReturnsMap = {},
  TAppContext extends Record<string, unknown> = AppContext,
> = {
  returns<const M extends ReturnsMap>(
    map: M,
  ): FluentMiddlewareBuilder<
    TQuery,
    TParams,
    TBody,
    TState,
    TCtx,
    Omit<TReturns, keyof M> & M,
    TAppContext
  >
  handler(
    fn: (
      ctx: StandaloneMiddlewareContext<TQuery, TParams, TBody, TAppContext>,
      next: FluentNext<TState, TCtx>,
    ) => Awaitable<ReplyResult | Response | unknown>,
  ): MiddlewareUnit<
    MiddlewareReturnFromParts<
      TQuery,
      TParams,
      TBody,
      TState extends undefined ? {} : TState,
      TCtx extends undefined ? {} : TCtx
    >,
    TReturns
  >
}

function createFluentBuilder<TAppContext extends Record<string, unknown> = AppContext>(
  state: MiddlewareBuilderState,
): FluentMiddlewareBuilder<unknown, unknown, unknown, undefined, undefined, {}, TAppContext> {
  return {
    returns(map: ReturnsMap) {
      return createFluentBuilder<TAppContext>({
        ...state,
        returns: { ...(state.returns ?? {}), ...map },
      })
    },
    handler(fn: (...args: never[]) => unknown) {
      const unit = {
        ...state,
        handler: fn,
        __middlewareAcc: undefined as unknown,
        ...(state.returns ? { __returns: state.returns } : {}),
      }
      return unit as unknown as MiddlewareUnit<
        MiddlewareReturnFromParts<unknown, unknown, unknown, unknown, unknown>,
        ReturnsMap
      >
    },
  } as unknown as FluentMiddlewareBuilder<unknown, unknown, unknown, undefined, undefined, {}, TAppContext>
}

export function defineMiddleware(middleware: HonoMiddlewareHandler): HonoMiddlewareUnit

export function defineMiddleware<
  TAppContext extends Record<string, unknown> = AppContext,
  TState = unknown,
  TCtx = unknown,
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
  TReturns extends ReturnsMap = {},
>(
  options: {
    state: Schema<TState>
    ctx: Schema<TCtx>
    query?: Schema<TQuery>
    params?: Schema<TParams>
    body?: Schema<TBody>
    returns?: TReturns
    handler: (
      ctx: StandaloneMiddlewareContext<TQuery, TParams, TBody, TAppContext>,
      next: (args: { state: TState, ctx: TCtx }) => Promise<ReplyResult>,
    ) => Awaitable<ReplyResult | Response | unknown>
  },
): MiddlewareUnit<
  MiddlewareReturnFromParts<TQuery, TParams, TBody, TState, TCtx>,
  TReturns
>

export function defineMiddleware<
  TAppContext extends Record<string, unknown> = AppContext,
  TState = unknown,
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
  TReturns extends ReturnsMap = {},
>(
  options: {
    state: Schema<TState>
    query?: Schema<TQuery>
    params?: Schema<TParams>
    body?: Schema<TBody>
    returns?: TReturns
    handler: (
      ctx: StandaloneMiddlewareContext<TQuery, TParams, TBody, TAppContext>,
      next: (args: { state: TState }) => Promise<ReplyResult>,
    ) => Awaitable<ReplyResult | Response | unknown>
  },
): MiddlewareUnit<
  MiddlewareReturnFromParts<TQuery, TParams, TBody, TState>,
  TReturns
>

export function defineMiddleware<
  TAppContext extends Record<string, unknown> = AppContext,
  TCtx = unknown,
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
  TReturns extends ReturnsMap = {},
>(
  options: {
    ctx: Schema<TCtx>
    query?: Schema<TQuery>
    params?: Schema<TParams>
    body?: Schema<TBody>
    returns?: TReturns
    handler: (
      ctx: StandaloneMiddlewareContext<TQuery, TParams, TBody, TAppContext>,
      next: (args: { ctx: TCtx }) => Promise<ReplyResult>,
    ) => Awaitable<ReplyResult | Response | unknown>
  },
): MiddlewareUnit<
  MiddlewareReturnFromParts<TQuery, TParams, TBody, {}, TCtx>,
  TReturns
>

export function defineMiddleware<
  TAppContext extends Record<string, unknown> = AppContext,
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
  TReturns extends ReturnsMap = {},
>(
  options: {
    query?: Schema<TQuery>
    params?: Schema<TParams>
    body?: Schema<TBody>
    returns?: TReturns
    handler: (
      ctx: StandaloneMiddlewareContext<TQuery, TParams, TBody, TAppContext>,
      next: () => Promise<ReplyResult>,
    ) => Awaitable<ReplyResult | Response | unknown>
  },
): MiddlewareUnit<
  MiddlewareReturnFromParts<TQuery, TParams, TBody, {}>,
  TReturns
>

export function defineMiddleware<
  TAppContext extends Record<string, unknown> = AppContext,
>(): FluentMiddlewareBuilder<unknown, unknown, unknown, undefined, undefined, {}, TAppContext>

export function defineMiddleware<
  TAppContext extends Record<string, unknown> = AppContext,
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
>(
  options: {
    query?: Schema<TQuery>
    params?: Schema<TParams>
    body?: Schema<TBody>
  },
): FluentMiddlewareBuilder<TQuery, TParams, TBody, undefined, undefined, {}, TAppContext>

export function defineMiddleware<
  TAppContext extends Record<string, unknown> = AppContext,
  TState = unknown,
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
>(
  options: {
    state: Schema<TState>
    query?: Schema<TQuery>
    params?: Schema<TParams>
    body?: Schema<TBody>
  },
): FluentMiddlewareBuilder<TQuery, TParams, TBody, TState, undefined, {}, TAppContext>

export function defineMiddleware<
  TAppContext extends Record<string, unknown> = AppContext,
  TCtx = unknown,
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
>(
  options: {
    ctx: Schema<TCtx>
    query?: Schema<TQuery>
    params?: Schema<TParams>
    body?: Schema<TBody>
  },
): FluentMiddlewareBuilder<TQuery, TParams, TBody, undefined, TCtx, {}, TAppContext>

export function defineMiddleware<
  TAppContext extends Record<string, unknown> = AppContext,
  TState = unknown,
  TCtx = unknown,
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
>(
  options: {
    state: Schema<TState>
    ctx: Schema<TCtx>
    query?: Schema<TQuery>
    params?: Schema<TParams>
    body?: Schema<TBody>
  },
): FluentMiddlewareBuilder<TQuery, TParams, TBody, TState, TCtx, {}, TAppContext>

export function defineMiddleware(options?: unknown): unknown {
  if (typeof options === 'function') {
    const honoMiddleware = options as HonoMiddlewareHandler
    return defineMiddleware({
      handler: (ctx, next) => createTaserCompatHandler(honoMiddleware)(ctx, next),
    })
  }

  if (options === undefined) {
    return createFluentBuilder({})
  }

  if (
    typeof options === 'object'
    && options !== null
    && !('handler' in options)
  ) {
    return createFluentBuilder(options)
  }

  return options
}

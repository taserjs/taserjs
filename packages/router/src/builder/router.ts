import {
  createTaserCompatHandler,
  createTaserRuntime,
  type NotFoundHandler,
  type OnErrorHandler,
  type RouteManifestShape,
} from "@taserjs/router-core";
import { normalizeOnError } from "@taserjs/router-utils";

import {
  createAllRoute,
  createAnyRoute,
  createDeleteRoute,
  createGetRoute,
  createHeadRoute,
  createOptionsRoute,
  createPatchRoute,
  createPostRoute,
  createPutRoute,
} from "./factories.js";
import { defineHandler } from "../define/handler.js";
import {
  defineMiddleware,
  type DefineMiddlewareOptions,
  type MultiScopedMiddlewareOptions,
  type ScopedMiddlewareOptions,
} from "../define/middleware.js";
import { createMiddleware } from "./middleware.js";
import { TaserApp } from "./app.js";
import type { ContextDefinition, CreateTaserAppOptions, OnErrorOptions } from "../types/app.js";
import type {
  AppContext,
  ExtractState,
  IsUnknown,
  MiddlewareReturnFromParts,
  MiddlewareUnit,
} from "../types/units.js";
import type { HandlerBuilder, LayoutId, MiddlewareBuilder } from "../types/index.js";
import type { ReturnsMap } from "../types/returns.js";
import type { Schema } from "../types/schema.js";
import type {
  CreateAllRoute,
  CreateAnyRoute,
  CreateWithBodyRoute,
  CreateWithoutBodyRoute,
} from "./factories.js";

function toOnErrorHandler(
  onErrorOptions: OnErrorOptions | OnErrorOptions["handle"],
): OnErrorHandler {
  return normalizeOnError(onErrorOptions);
}

type RouterState = {
  options: CreateTaserAppOptions;
  contextDef: ContextDefinition<Record<string, unknown>, Record<string, unknown>>;
  onError?: OnErrorHandler;
  notFound?: NotFoundHandler;
};

const emptyContext: ContextDefinition<Record<string, unknown>, Record<string, unknown>> = {};

export class TaserRouter<TAppContext extends Record<string, unknown> = AppContext> {
  private readonly state: RouterState;

  constructor(options: CreateTaserAppOptions = {}, state?: Partial<Omit<RouterState, "options">>) {
    this.state = {
      options,
      contextDef: state?.contextDef ?? emptyContext,
      ...(state?.onError !== undefined ? { onError: state.onError } : {}),
      ...(state?.notFound !== undefined ? { notFound: state.notFound } : {}),
    };
  }

  context<TBoot extends Record<string, unknown>, TReq extends Record<string, unknown>>(
    definition: ContextDefinition<TBoot, TReq>,
  ): TaserRouter<TBoot & TReq> {
    this.state.contextDef = definition;
    return this as unknown as TaserRouter<TBoot & TReq>;
  }

  onError<TResponses extends ReturnsMap = ReturnsMap>(
    options: OnErrorOptions<TResponses> | OnErrorOptions<TResponses>["handle"],
  ): this {
    this.state.onError = toOnErrorHandler(options);
    return this;
  }

  notFound(handler: (ctx: unknown) => Response | Promise<Response> | unknown): this {
    this.state.notFound = (ctx) => handler(ctx);
    return this;
  }

  get: CreateWithoutBodyRoute<"GET", TAppContext> = createGetRoute as CreateWithoutBodyRoute<
    "GET",
    TAppContext
  >;
  post: CreateWithBodyRoute<"POST", TAppContext> = createPostRoute as CreateWithBodyRoute<
    "POST",
    TAppContext
  >;
  put: CreateWithBodyRoute<"PUT", TAppContext> = createPutRoute as CreateWithBodyRoute<
    "PUT",
    TAppContext
  >;
  patch: CreateWithBodyRoute<"PATCH", TAppContext> = createPatchRoute as CreateWithBodyRoute<
    "PATCH",
    TAppContext
  >;
  delete: CreateWithoutBodyRoute<"DELETE", TAppContext> =
    createDeleteRoute as CreateWithoutBodyRoute<"DELETE", TAppContext>;
  options: CreateWithoutBodyRoute<"OPTIONS", TAppContext> =
    createOptionsRoute as CreateWithoutBodyRoute<"OPTIONS", TAppContext>;
  head: CreateWithoutBodyRoute<"HEAD", TAppContext> = createHeadRoute as CreateWithoutBodyRoute<
    "HEAD",
    TAppContext
  >;
  any: CreateAnyRoute<TAppContext> = createAnyRoute as CreateAnyRoute<TAppContext>;
  all: CreateAllRoute<TAppContext> = createAllRoute as CreateAllRoute<TAppContext>;

  middleware<const Layout extends LayoutId>(
    layout: Layout,
  ): MiddlewareBuilder<Layout, readonly [], TAppContext> {
    return createMiddleware(layout) as MiddlewareBuilder<Layout, readonly [], TAppContext>;
  }

  defineHandler<TQuery = unknown, TParams = unknown, TBody = unknown>(options?: {
    query?: Schema<TQuery>;
    params?: Schema<TParams>;
    body?: Schema<TBody>;
  }): HandlerBuilder<
    readonly [],
    { query: TQuery; params: TParams; body: TBody },
    {},
    TAppContext
  > {
    return options === undefined
      ? defineHandler<TAppContext>()
      : defineHandler<TAppContext>(options);
  }

  defineMiddleware(
    middleware: Parameters<typeof createTaserCompatHandler>[0],
  ): MiddlewareUnit<MiddlewareReturnFromParts<unknown, unknown, unknown, {}>, {}, null, {}>;

  defineMiddleware<
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

  defineMiddleware<
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

  defineMiddleware<
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

  defineMiddleware(first: any, second?: any): any {
    return defineMiddleware(first, second);
  }

  create<const TManifest extends RouteManifestShape>(manifest: TManifest): TaserApp<TManifest> {
    const definition = this.state.contextDef;
    const validateResponse = this.state.options.response?.validate ?? true;
    const onValidationFailure = this.state.options.response?.onValidationFailure;
    const basePath = this.state.options.basePath;

    const hasCustomContext = definition.boot !== undefined || definition.request !== undefined;
    const bootPromise = hasCustomContext
      ? Promise.resolve(definition.boot?.() ?? ({} as Record<string, unknown>))
      : undefined;

    const contextFactory = hasCustomContext
      ? async ({ native }: { native?: unknown } = {}) => {
          const bootContext = (await bootPromise) ?? {};
          const requestContext = (await definition.request?.({ native: native as never })) ?? {};
          return { ...bootContext, ...requestContext };
        }
      : () => ({});

    const runtime = createTaserRuntime(manifest, contextFactory, {
      ...(basePath !== undefined ? { basePath } : {}),
      response: {
        validate: validateResponse,
        ...(onValidationFailure !== undefined ? { onValidationFailure } : {}),
      },
      ...(this.state.onError !== undefined ? { onError: this.state.onError } : {}),
      ...(this.state.notFound !== undefined ? { notFound: this.state.notFound } : {}),
      ...(this.state.options.cookies !== undefined ? { cookies: this.state.options.cookies } : {}),
    });

    return new TaserApp(runtime, manifest);
  }
}

export function createTaserApp(options: CreateTaserAppOptions = {}): TaserRouter {
  return new TaserRouter(options);
}

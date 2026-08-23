import {
  createTaserRuntime,
  type NotFoundHandler,
  type OnErrorHandler,
  type RouteManifestShape,
} from "@taserjs/router-core";
import { isPromise, normalizeOnError, composeBasePath } from "@taserjs/router-utils";

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
import { defineMiddleware, type DefineMiddlewareFn } from "../define/middleware.js";
import { createMiddleware } from "./middleware.js";
import { TaserApp } from "./app.js";
import type { ContextDefinition, CreateTaserAppOptions, OnErrorOptions } from "../types/app.js";
import type { AppContext } from "../types/units.js";
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

export class TaserRouter<
  TAppContext extends Record<string, unknown> = AppContext,
  TOptions extends CreateTaserAppOptions = CreateTaserAppOptions,
> {
  private readonly state: RouterState;

  constructor(options: TOptions = {} as TOptions, state?: Partial<Omit<RouterState, "options">>) {
    this.state = {
      options,
      contextDef: state?.contextDef ?? emptyContext,
      ...(state?.onError !== undefined ? { onError: state.onError } : {}),
      ...(state?.notFound !== undefined ? { notFound: state.notFound } : {}),
    };
  }

  context<TBoot extends Record<string, unknown>, TReq extends Record<string, unknown>>(
    definition: ContextDefinition<TBoot, TReq>,
  ): TaserRouter<TBoot & TReq, TOptions> {
    this.state.contextDef = definition;
    return this as unknown as TaserRouter<TBoot & TReq, TOptions>;
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

  defineMiddleware: DefineMiddlewareFn<TAppContext> =
    defineMiddleware as DefineMiddlewareFn<TAppContext>;

  create<const TManifest extends RouteManifestShape>(
    manifest: TManifest,
    runtimeOptions?: { basePath?: string },
  ): TaserApp<TManifest, TOptions extends { passThroughOnMiss: true } ? true : false> {
    const definition = this.state.contextDef;
    const validateResponse = this.state.options.response?.validate ?? true;
    const onValidationFailure = this.state.options.response?.onValidationFailure;
    const appBasePath = this.state.options.basePath;
    const basePath =
      runtimeOptions?.basePath !== undefined
        ? appBasePath
          ? composeBasePath(runtimeOptions.basePath, appBasePath)
          : runtimeOptions.basePath
        : appBasePath;

    const hasCustomContext = definition.boot !== undefined || definition.request !== undefined;
    let bootContextResolved: Record<string, unknown> | undefined;
    let bootPromise: Promise<Record<string, unknown>> | undefined;

    if (definition.boot !== undefined) {
      const bootResult = definition.boot();
      if (isPromise(bootResult)) {
        bootPromise = bootResult.then((ctx) => {
          bootContextResolved = (ctx ?? {}) as Record<string, unknown>;
          return bootContextResolved;
        });
      } else {
        bootContextResolved = (bootResult ?? {}) as Record<string, unknown>;
      }
    } else if (hasCustomContext) {
      bootContextResolved = {};
    }

    const contextFactory = hasCustomContext
      ? (req?: Request) => {
          if (bootPromise !== undefined && bootContextResolved === undefined) {
            return bootPromise.then(async (bootContext) => {
              if (!definition.request) {
                return { ...bootContext };
              }
              const requestResult = definition.request(req!);
              const requestContext = isPromise(requestResult) ? await requestResult : requestResult;
              return { ...bootContext, ...requestContext };
            });
          }

          const bootContext = bootContextResolved ?? {};
          if (!definition.request) {
            return { ...bootContext };
          }

          const requestResult = definition.request(req!);
          if (isPromise(requestResult)) {
            return requestResult.then((requestContext) => ({
              ...bootContext,
              ...requestContext,
            }));
          }

          return { ...bootContext, ...(requestResult as Record<string, unknown>) };
        }
      : () => ({});

    const runtime = createTaserRuntime(manifest, contextFactory, {
      ...(basePath !== undefined ? { basePath } : {}),
      ...(this.state.options.passThroughOnMiss !== undefined
        ? { passThroughOnMiss: this.state.options.passThroughOnMiss }
        : {}),
      response: {
        validate: validateResponse,
        ...(onValidationFailure !== undefined ? { onValidationFailure } : {}),
      },
      ...(this.state.onError !== undefined ? { onError: this.state.onError } : {}),
      ...(this.state.notFound !== undefined ? { notFound: this.state.notFound } : {}),
      ...(this.state.options.cookies !== undefined ? { cookies: this.state.options.cookies } : {}),
    });

    return new TaserApp(runtime, manifest) as TaserApp<
      TManifest,
      TOptions extends { passThroughOnMiss: true } ? true : false
    >;
  }
}

export function createTaserApp<
  const TOptions extends CreateTaserAppOptions = CreateTaserAppOptions,
>(options: TOptions = {} as TOptions): TaserRouter<AppContext, TOptions> {
  return new TaserRouter(options);
}

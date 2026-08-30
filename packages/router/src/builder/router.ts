import {
  createTaserRuntime,
  type NotFoundHandler,
  type OnErrorHandler,
  type RouteManifestShape,
} from "@taserjs/router-core";
import { isPromise, normalizeOnError } from "@taserjs/router-utils";

import { TaserApp } from "./app.js";
import type { ContextDefinition, CreateTaserAppOptions, OnErrorOptions } from "../types/app.js";
import type { EmptyAppContext } from "../types/units.js";
import type { ReturnsMap } from "../types/returns.js";

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
  TAppContext extends Record<string, unknown> = EmptyAppContext,
  THasNotFound extends boolean = false,
> {
  private readonly state: RouterState;
  readonly $Infer!: {
    Context: TAppContext;
  };

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
  ): TaserRouter<TBoot & TReq, THasNotFound> {
    this.state.contextDef = definition;
    return this as unknown as TaserRouter<TBoot & TReq, THasNotFound>;
  }

  onError<TResponses extends ReturnsMap = ReturnsMap>(
    options: OnErrorOptions<TResponses> | OnErrorOptions<TResponses>["handle"],
  ): this {
    this.state.onError = toOnErrorHandler(options);
    return this;
  }

  notFound(
    handler: (ctx: unknown) => Response | Promise<Response> | unknown,
  ): TaserRouter<TAppContext, true> {
    this.state.notFound = (ctx) => handler(ctx);
    return this as unknown as TaserRouter<TAppContext, true>;
  }

  create<const TManifest extends RouteManifestShape>(
    manifest: TManifest,
    runtimeOptions?: { basePath?: string },
  ): TaserApp<TManifest, THasNotFound> {
    const definition = this.state.contextDef;
    const validateResponse = this.state.options.response?.validate ?? true;
    const onValidationFailure = this.state.options.response?.onValidationFailure;
    const basePath = runtimeOptions?.basePath;

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
      response: {
        validate: validateResponse,
        ...(onValidationFailure !== undefined ? { onValidationFailure } : {}),
      },
      ...(this.state.onError !== undefined ? { onError: this.state.onError } : {}),
      ...(this.state.notFound !== undefined ? { notFound: this.state.notFound } : {}),
      ...(this.state.options.cookies !== undefined ? { cookies: this.state.options.cookies } : {}),
    });

    return new TaserApp(runtime, manifest) as unknown as TaserApp<TManifest, THasNotFound>;
  }
}

export function createTaserApp(
  options: CreateTaserAppOptions = {},
): TaserRouter<EmptyAppContext, false> {
  return new TaserRouter<EmptyAppContext, false>(options);
}

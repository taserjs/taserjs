import type { ResponseValidationFailureHandler } from "@taserjs/router-utils";
import type { CookieRuntimeConfig, TaserCookieJar } from "./cookies/taser-cookies.js";
import type { TaserHeaders } from "./headers/taser-headers.js";

import type { HttpMethod, HttpVerb } from "@taserjs/router-utils/http";

export type { HttpMethod, HttpVerb };

export type Awaitable<T> = T | PromiseLike<T>;

export type PipelineContext = {
  state: Record<string, unknown>;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  body?: unknown;
  headers?: TaserHeaders;
  cookies?: TaserCookieJar;
  method?: string;
  path?: string;
  url?: URL;
  request?: Request;
  var?: Record<string, unknown>;
  [key: string]: unknown;
};

export type PipelineNext = (state?: Record<string, unknown>) => Awaitable<unknown>;

export type PipelineLayer = {
  run: (ctx: PipelineContext, next: PipelineNext) => Awaitable<unknown>;
};

export type BodyMode = "json" | "form" | "urlencoded";

export type MiddlewareDefinition<TReturns = Readonly<Record<number, unknown>>> = {
  query?: unknown;
  params?: unknown;
  body?: unknown;
  bodyMode?: BodyMode | undefined;
  returns?: TReturns | undefined;
  handler?: ((ctx: unknown, next: PipelineNext) => Awaitable<unknown>) | undefined;
};

export type MiddlewareChain = {
  readonly layout?: string;
  readonly path?: string;
  readonly method?: string;
  readonly middlewares: readonly MiddlewareDefinition[];
  use?(definition: MiddlewareDefinition): MiddlewareChain;
};

export type RouteHandler = {
  readonly path: string;
  readonly method: HttpMethod;
  readonly middlewares: readonly MiddlewareDefinition[];
  readonly returns?: Record<number, unknown>;
  readonly bodyMode?: BodyMode;
  handler: (ctx: unknown) => Awaitable<unknown>;
  query?: unknown;
  params?: unknown;
  body?: unknown;
};

export type ManifestLayoutEntry = unknown;

export type ManifestRouteEntry = {
  layouts: readonly string[];
  route: unknown;
};

export type RouteManifestShape = {
  layouts: Record<string, unknown>;
  routes: Record<string, Partial<Record<HttpMethod, ManifestRouteEntry>>>;
};

export type ContextFactory = (
  request?: Request,
) => Record<string, unknown> | Promise<Record<string, unknown>>;

export type OnErrorHandler = {
  responses?: Record<number, unknown> | undefined;
  handle: (error: unknown, ctx?: unknown) => Awaitable<unknown>;
};

export type NotFoundHandler = (ctx: PipelineContext) => Awaitable<unknown>;

export type CreateTaserRuntimeOptions = {
  basePath?: string;
  onError?: OnErrorHandler;
  notFound?: NotFoundHandler;
  response?: {
    /** Validate handler replies against returns maps. Default true. */
    validate?: boolean;
    onValidationFailure?: ResponseValidationFailureHandler;
  };
  cookies?: CookieRuntimeConfig;
};

/**
 * Minimal structural stand-in for Hono's ExecutionContext (fetch environments).
 * Kept local so the runtime carries no framework type dependency.
 */
export type FetchExecutionContext = {
  waitUntil?(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
};

export type TaserRuntime<THasNotFound extends boolean = boolean> = {
  fetch(
    request: Request,
    env?: unknown,
    executionCtx?: FetchExecutionContext,
  ): THasNotFound extends true
    ? Promise<Response> | Response
    : Promise<Response | undefined> | Response | undefined;
  request(
    path: string,
    init?: RequestInit,
  ): THasNotFound extends true ? Promise<Response> : Promise<Response | undefined>;
  onError(handler: OnErrorHandler | OnErrorHandler["handle"]): TaserRuntime<THasNotFound>;
  notFound(handler: NotFoundHandler): TaserRuntime<true>;
};

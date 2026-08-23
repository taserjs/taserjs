import type { ResponseValidationFailureHandler } from "@taserjs/router-utils";
import type { TaserCookieJar } from "./cookies/taser-cookies.js";
import type { TaserHeaders } from "./headers/taser-headers.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";

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

export type PipelineNext = (state?: Record<string, unknown>) => Promise<unknown>;

export type PipelineLayer = {
  run: (ctx: PipelineContext, next: PipelineNext) => Promise<unknown>;
};

export type BodyMode = "json" | "form" | "urlencoded";

export type MiddlewareDefinition = {
  query?: unknown;
  params?: unknown;
  body?: unknown;
  bodyMode?: BodyMode;
  returns?: Record<number, unknown>;
  handler: (
    ctx: unknown,
    next: (state?: Record<string, unknown>) => Promise<unknown>,
  ) => Awaitable<unknown>;
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
  readonly handlerMiddlewares?: readonly MiddlewareDefinition[];
  readonly returns?: Record<number, unknown>;
  readonly bodyMode?: BodyMode;
  readonly handlerBodyMode?: BodyMode;
  handler: (ctx: unknown) => Awaitable<unknown>;
  query?: unknown;
  params?: unknown;
  body?: unknown;
  handlerQuery?: unknown;
  handlerParams?: unknown;
  handlerBody?: unknown;
};

export type ManifestLayoutEntry = {
  middlewares: unknown;
};

export type ManifestRouteEntry = {
  layoutChain: readonly string[];
  route: unknown;
};

export type RouteManifestShape = {
  layouts: Record<string, ManifestLayoutEntry>;
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
  passThroughOnMiss?: boolean;
  onError?: OnErrorHandler;
  notFound?: NotFoundHandler;
  response?: {
    /** Validate handler replies against returns maps. Default true. */
    validate?: boolean;
    onValidationFailure?: ResponseValidationFailureHandler;
  };
  cookies?: {
    secret?: string | BufferSource;
    /** Default serialize options for all set/setSigned/delete calls. Per-call options override. */
    path?: string;
    httpOnly?: boolean;
    sameSite?: "Strict" | "Lax" | "None" | "strict" | "lax" | "none";
    secure?: boolean;
    domain?: string;
    maxAge?: number;
    expires?: Date;
  };
};

/**
 * Minimal structural stand-in for Hono's ExecutionContext (fetch environments).
 * Kept local so the runtime carries no framework type dependency.
 */
export type FetchExecutionContext = {
  waitUntil?(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
};

export type TaserRuntime<TPassThrough extends boolean = boolean> = {
  fetch(
    request: Request,
    env?: unknown,
    executionCtx?: FetchExecutionContext,
  ): TPassThrough extends true
    ? Promise<Response | undefined> | Response | undefined
    : Promise<Response> | Response;
  onError(handler: OnErrorHandler | OnErrorHandler["handle"]): TaserRuntime<TPassThrough>;
  notFound(handler: NotFoundHandler): TaserRuntime<TPassThrough>;
};

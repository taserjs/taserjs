export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";

export type Awaitable<T> = T | PromiseLike<T>;

export type MiddlewareDefinition = {
  state?: unknown;
  ctx?: unknown;
  query?: unknown;
  params?: unknown;
  body?: unknown;
  returns?: Record<number, unknown>;
  handler: (
    ctx: unknown,
    next: (args?: { state?: unknown; ctx?: unknown }) => Promise<unknown>,
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

export type CreateContextArgs = {
  native?: unknown;
};

export type ContextFactory = (
  args: CreateContextArgs,
) => Record<string, unknown> | Promise<Record<string, unknown>>;

export type OnErrorHandler = {
  responses?: Record<number, unknown> | undefined;
  handle: (error: unknown, ctx?: unknown) => Awaitable<unknown>;
};

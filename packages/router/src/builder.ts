import type { StandardSchemaV1 } from "@standard-schema/spec";
import { hono } from "./hono.js";
import { defineTaser } from "./taser.js";
import type {
  BodyMode,
  HttpMethod,
  InferRouteServices,
  InferRouteState,
  LayoutDefinition,
  MiddlewareDefinition,
  MiddlewareHandler,
  RegisteredRoutePath,
  RouteDefaultParams,
  RouteDefinition,
  RouteHandler,
  RouteSchemas,
  StatusCode,
} from "./types.js";

export function toMiddlewareDefinition<TServices = {}, TState = {}>(
  input: MiddlewareDefinition<TServices, TState, any> | MiddlewareHandler<any, any>,
): MiddlewareDefinition<TServices, TState> {
  if (typeof input === "function") {
    return {
      kind: "middleware",
      handler: input as MiddlewareHandler,
    };
  }
  return input as MiddlewareDefinition<TServices, TState>;
}

export class MiddlewareBuilder {
  public readonly schemas: RouteSchemas = {};

  params(schema: StandardSchemaV1): this {
    this.schemas.params = schema;
    return this;
  }

  query(schema: StandardSchemaV1): this {
    this.schemas.query = schema;
    return this;
  }

  body(schema: StandardSchemaV1, mode?: BodyMode): this {
    this.schemas.body = { schema, mode };
    return this;
  }

  handler<TServices = {}, TState = {}>(
    fn: MiddlewareHandler<TServices, any>,
  ): MiddlewareDefinition<TServices, TState> {
    return {
      kind: "middleware",
      handler: fn as MiddlewareHandler,
      schemas: Object.keys(this.schemas).length > 0 ? { ...this.schemas } : undefined,
    };
  }
}

export function middleware<TServices = {}, TState = {}>(
  fn: MiddlewareHandler<TServices, any>,
): MiddlewareDefinition<TServices, TState>;
export function middleware(): MiddlewareBuilder;
export function middleware(
  fn?: MiddlewareHandler<any, any>,
): MiddlewareBuilder | MiddlewareDefinition<any, any> {
  if (fn) {
    return {
      kind: "middleware",
      handler: fn,
    };
  }
  return new MiddlewareBuilder();
}

export class LayoutBuilder<
  TPath extends string = string,
  TParams = RouteDefaultParams<TPath>,
  TServices = {},
  TState = {},
> implements LayoutDefinition<TPath, TServices, TState> {
  readonly kind = "layout" as const;
  public readonly path: TPath;
  public readonly middlewares: MiddlewareDefinition<any, any>[] = [];

  readonly _services?: TServices;
  readonly _state?: TState;

  constructor(path: TPath) {
    this.path = path;
  }

  use<TMwServices = {}, TMwState = {}>(
    middleware: MiddlewareDefinition<TMwServices, TMwState, any> | MiddlewareHandler<any, TParams>,
  ): LayoutBuilder<TPath, TParams, TServices & TMwServices, TState & TMwState> {
    this.middlewares.push(toMiddlewareDefinition(middleware));
    return this as unknown as LayoutBuilder<
      TPath,
      TParams,
      TServices & TMwServices,
      TState & TMwState
    >;
  }
}

export function layout<TPath extends string>(
  path: TPath,
): LayoutBuilder<TPath, RouteDefaultParams<TPath>> {
  return new LayoutBuilder<TPath, RouteDefaultParams<TPath>>(path);
}

export class RouteBuilder<
  TMethod extends HttpMethod = HttpMethod,
  TPath extends string = string,
  TParams = RouteDefaultParams<TPath>,
  TQuery = Record<string, string | string[]>,
  TBody = unknown,
  TRouteServices = {},
  TRouteState = {},
> {
  public readonly middlewares: MiddlewareDefinition<any, any>[] = [];
  public readonly schemas: RouteSchemas = {};

  constructor(
    public readonly method: TMethod,
    public readonly path: TPath,
  ) {}

  use<TMwServices = {}, TMwState = {}>(
    middleware: MiddlewareDefinition<TMwServices, TMwState, any> | MiddlewareHandler<any, TParams>,
  ): RouteBuilder<
    TMethod,
    TPath,
    TParams,
    TQuery,
    TBody,
    TRouteServices & TMwServices,
    TRouteState & TMwState
  > {
    this.middlewares.push(toMiddlewareDefinition(middleware));
    return this as unknown as RouteBuilder<
      TMethod,
      TPath,
      TParams,
      TQuery,
      TBody,
      TRouteServices & TMwServices,
      TRouteState & TMwState
    >;
  }

  params<TSchema extends StandardSchemaV1>(
    schema: TSchema,
  ): RouteBuilder<
    TMethod,
    TPath,
    StandardSchemaV1.InferOutput<TSchema>,
    TQuery,
    TBody,
    TRouteServices,
    TRouteState
  > {
    this.schemas.params = schema;
    return this as unknown as RouteBuilder<
      TMethod,
      TPath,
      StandardSchemaV1.InferOutput<TSchema>,
      TQuery,
      TBody,
      TRouteServices,
      TRouteState
    >;
  }

  query<TSchema extends StandardSchemaV1>(
    schema: TSchema,
  ): RouteBuilder<
    TMethod,
    TPath,
    TParams,
    StandardSchemaV1.InferOutput<TSchema>,
    TBody,
    TRouteServices,
    TRouteState
  > {
    this.schemas.query = schema;
    return this as unknown as RouteBuilder<
      TMethod,
      TPath,
      TParams,
      StandardSchemaV1.InferOutput<TSchema>,
      TBody,
      TRouteServices,
      TRouteState
    >;
  }

  body<TSchema extends StandardSchemaV1>(
    schema: TSchema,
    mode?: BodyMode,
  ): RouteBuilder<
    TMethod,
    TPath,
    TParams,
    TQuery,
    StandardSchemaV1.InferOutput<TSchema>,
    TRouteServices,
    TRouteState
  > {
    this.schemas.body = { schema, mode };
    return this as unknown as RouteBuilder<
      TMethod,
      TPath,
      TParams,
      TQuery,
      StandardSchemaV1.InferOutput<TSchema>,
      TRouteServices,
      TRouteState
    >;
  }

  returns(map: Record<StatusCode, StandardSchemaV1>): this {
    this.schemas.returns = { ...this.schemas.returns, ...map };
    return this;
  }

  handler(
    fn: RouteHandler<
      TParams,
      TQuery,
      TBody,
      InferRouteServices<TPath, TMethod> & TRouteServices,
      InferRouteState<TPath, TMethod> & TRouteState
    >,
  ): RouteDefinition<TPath> {
    return {
      kind: "route",
      method: this.method,
      path: this.path,
      middlewares: [...this.middlewares],
      handler: fn as RouteHandler<any, any, any, any, any>,
      schemas: { ...this.schemas },
      returns: this.schemas.returns ? { ...this.schemas.returns } : undefined,
    };
  }
}

export const t = {
  get: <TPath extends RegisteredRoutePath>(path: TPath) =>
    new RouteBuilder<"GET", TPath>("GET", path),
  post: <TPath extends RegisteredRoutePath>(path: TPath) =>
    new RouteBuilder<"POST", TPath>("POST", path),
  put: <TPath extends RegisteredRoutePath>(path: TPath) =>
    new RouteBuilder<"PUT", TPath>("PUT", path),
  delete: <TPath extends RegisteredRoutePath>(path: TPath) =>
    new RouteBuilder<"DELETE", TPath>("DELETE", path),
  patch: <TPath extends RegisteredRoutePath>(path: TPath) =>
    new RouteBuilder<"PATCH", TPath>("PATCH", path),
  layout,
  middleware,
  hono,
  app: defineTaser,
};

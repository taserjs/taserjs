import type { StandardSchemaV1 } from "@standard-schema/spec";
import { hono } from "./hono.js";
import { defineTaser } from "./taser.js";
import type {
  BodyMode,
  ExtractBodyFromMiddleware,
  ExtractParamsFromMiddleware,
  ExtractQueryFromMiddleware,
  HttpMethod,
  InferEffectiveParams,
  InferLayoutBody,
  InferLayoutParams,
  InferLayoutQuery,
  InferLayoutServices,
  InferLayoutState,
  InferReturnsResponse,
  InferRouteBody,
  InferRouteQuery,
  InferRouteServices,
  InferRouteState,
  InferServicesFromMw,
  InferStateFromMw,
  LayoutDefinition,
  MiddlewareArgs,
  MiddlewareDefinition,
  MiddlewareHandler,
  MiddlewareResponse,
  NextFunction,
  Overwrite,
  RegisteredRoutePath,
  RouteDefaultParams,
  RouteDefinition,
  RouteHandler,
  RouteSchemas,
  StatusCode,
} from "./types.js";

export function toMiddlewareDefinition<TMw>(
  input: TMw,
): MiddlewareDefinition<
  InferServicesFromMw<TMw>,
  InferStateFromMw<TMw>,
  ExtractParamsFromMiddleware<TMw>,
  ExtractQueryFromMiddleware<TMw>,
  ExtractBodyFromMiddleware<TMw>
> {
  if (typeof input === "function") {
    return {
      kind: "middleware",
      handler: input as MiddlewareHandler,
    } as any;
  }
  return input as any;
}

export class MiddlewareBuilder<
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
> implements MiddlewareDefinition<{}, {}, TParams, TQuery, TBody> {
  public readonly kind = "middleware" as const;
  public readonly schemas: RouteSchemas = {};

  readonly _services?: {};
  readonly _state?: {};
  readonly _params?: TParams;
  readonly _query?: TQuery;
  readonly _body?: TBody;

  constructor() {
    this.handler = this.handler.bind(this);
  }

  params<TSchema extends StandardSchemaV1>(
    schema: TSchema,
  ): MiddlewareBuilder<StandardSchemaV1.InferOutput<TSchema>, TQuery, TBody> {
    this.schemas.params = schema;
    return this as unknown as MiddlewareBuilder<
      StandardSchemaV1.InferOutput<TSchema>,
      TQuery,
      TBody
    >;
  }

  query<TSchema extends StandardSchemaV1>(
    schema: TSchema,
  ): MiddlewareBuilder<TParams, StandardSchemaV1.InferOutput<TSchema>, TBody> {
    this.schemas.query = schema;
    return this as unknown as MiddlewareBuilder<
      TParams,
      StandardSchemaV1.InferOutput<TSchema>,
      TBody
    >;
  }

  body<TSchema extends StandardSchemaV1>(
    schema: TSchema,
    mode?: BodyMode,
  ): MiddlewareBuilder<TParams, TQuery, StandardSchemaV1.InferOutput<TSchema>> {
    this.schemas.body = { schema, mode };
    return this as unknown as MiddlewareBuilder<
      TParams,
      TQuery,
      StandardSchemaV1.InferOutput<TSchema>
    >;
  }

  handler(
    args: MiddlewareArgs<any, any, any, any, any>,
    next: NextFunction,
  ):
    | Response
    | Promise<Response>
    | MiddlewareResponse<any, any>
    | Promise<MiddlewareResponse<any, any>>;
  handler<
    F extends (
      args: MiddlewareArgs<
        {},
        {},
        [TParams] extends [never]
          ? Record<string, string>
          : unknown extends TParams
            ? Record<string, string>
            : TParams,
        [TQuery] extends [never]
          ? Record<string, string | string[]>
          : unknown extends TQuery
            ? Record<string, string | string[]>
            : TQuery,
        TBody
      >,
      next: NextFunction,
    ) => any,
  >(
    fn: F,
  ): MiddlewareDefinition<InferServicesFromMw<F>, InferStateFromMw<F>, TParams, TQuery, TBody>;
  handler(arg1?: any, arg2?: any): any {
    if (typeof arg1 === "function" && arg2 === undefined) {
      return {
        kind: "middleware",
        handler: arg1 as unknown as MiddlewareHandler,
        schemas: Object.keys(this.schemas).length > 0 ? { ...this.schemas } : undefined,
      };
    }
    if (typeof arg2 === "function") {
      return Promise.resolve(arg2());
    }
    return async (_args: any, next: NextFunction) => next();
  }
}

export function middleware<F extends (args: MiddlewareArgs<{}, {}>, next: NextFunction) => any>(
  fn: F,
): MiddlewareDefinition<InferServicesFromMw<F>, InferStateFromMw<F>>;
export function middleware(): MiddlewareBuilder;
export function middleware(
  fn?: (...args: any[]) => any,
): MiddlewareBuilder | MiddlewareDefinition<any, any> {
  if (fn) {
    return {
      kind: "middleware",
      handler: fn as MiddlewareHandler,
    };
  }
  return new MiddlewareBuilder();
}

export class LayoutBuilder<
  TPath extends string = string,
  TParams = RouteDefaultParams<TPath>,
  TServices = {},
  TState = {},
  TQuery = Record<string, string | string[]>,
  TBody = unknown,
> implements LayoutDefinition<TPath, TServices, TState, TParams, TQuery, TBody> {
  readonly kind = "layout" as const;
  public readonly path: TPath;
  public readonly middlewares: MiddlewareDefinition<any, any, any, any, any>[] = [];

  readonly _services?: TServices;
  readonly _state?: TState;
  readonly _params?: TParams;
  readonly _query?: TQuery;
  readonly _body?: TBody;

  public readonly schemas: RouteSchemas = {};

  constructor(path: TPath) {
    this.path = path;
  }

  private pushSchemaMiddleware(schemas: RouteSchemas): void {
    this.middlewares.push({
      kind: "middleware",
      handler: async (_args, next) => next(),
      schemas,
    });
  }

  params<TSchema extends StandardSchemaV1>(
    schema: TSchema,
  ): LayoutBuilder<
    TPath,
    Overwrite<TParams, StandardSchemaV1.InferOutput<TSchema>>,
    TServices,
    TState,
    TQuery,
    TBody
  > {
    this.schemas.params = schema;
    this.pushSchemaMiddleware({ params: schema });
    return this as unknown as LayoutBuilder<
      TPath,
      Overwrite<TParams, StandardSchemaV1.InferOutput<TSchema>>,
      TServices,
      TState,
      TQuery,
      TBody
    >;
  }

  query<TSchema extends StandardSchemaV1>(
    schema: TSchema,
  ): LayoutBuilder<
    TPath,
    TParams,
    TServices,
    TState,
    StandardSchemaV1.InferOutput<TSchema>,
    TBody
  > {
    this.schemas.query = schema;
    this.pushSchemaMiddleware({ query: schema });
    return this as unknown as LayoutBuilder<
      TPath,
      TParams,
      TServices,
      TState,
      StandardSchemaV1.InferOutput<TSchema>,
      TBody
    >;
  }

  body<TSchema extends StandardSchemaV1>(
    schema: TSchema,
    mode?: BodyMode,
  ): LayoutBuilder<
    TPath,
    TParams,
    TServices,
    TState,
    TQuery,
    StandardSchemaV1.InferOutput<TSchema>
  > {
    this.schemas.body = { schema, mode };
    this.pushSchemaMiddleware({ body: { schema, mode } });
    return this as unknown as LayoutBuilder<
      TPath,
      TParams,
      TServices,
      TState,
      TQuery,
      StandardSchemaV1.InferOutput<TSchema>
    >;
  }

  use<
    TMw extends
      | MiddlewareDefinition<any, any, any, any, any>
      | ((
          args: MiddlewareArgs<
            InferLayoutServices<TPath> & TServices,
            InferLayoutState<TPath> & TState,
            [keyof InferLayoutParams<TPath>] extends [never]
              ? [TParams] extends [never]
                ? Record<string, string>
                : unknown extends TParams
                  ? Record<string, string>
                  : TParams
              : Overwrite<InferLayoutParams<TPath>, TParams>,
            string extends keyof TQuery
              ? [keyof InferLayoutQuery<TPath>] extends [never]
                ? Record<string, string | string[]>
                : InferLayoutQuery<TPath>
              : [keyof InferLayoutQuery<TPath>] extends [never]
                ? TQuery
                : Overwrite<InferLayoutQuery<TPath>, TQuery>,
            [keyof InferLayoutBody<TPath>] extends [never]
              ? TBody
              : Overwrite<InferLayoutBody<TPath>, TBody>
          >,
          next: NextFunction,
        ) => any),
  >(
    middleware: TMw,
  ): LayoutBuilder<
    TPath,
    Overwrite<TParams, ExtractParamsFromMiddleware<TMw>>,
    TServices & InferServicesFromMw<TMw>,
    TState & InferStateFromMw<TMw>,
    Overwrite<TQuery, ExtractQueryFromMiddleware<TMw>>,
    Overwrite<TBody, ExtractBodyFromMiddleware<TMw>>
  > {
    this.middlewares.push(toMiddlewareDefinition(middleware));
    return this as unknown as LayoutBuilder<
      TPath,
      Overwrite<TParams, ExtractParamsFromMiddleware<TMw>>,
      TServices & InferServicesFromMw<TMw>,
      TState & InferStateFromMw<TMw>,
      Overwrite<TQuery, ExtractQueryFromMiddleware<TMw>>,
      Overwrite<TBody, ExtractBodyFromMiddleware<TMw>>
    >;
  }
}

export function layout<TPath extends string>(
  path: TPath,
): LayoutBuilder<TPath, RouteDefaultParams<TPath>> {
  return new LayoutBuilder<TPath, RouteDefaultParams<TPath>>(path);
}

export class RouteValidationBuilder<
  TMethod extends HttpMethod = HttpMethod,
  TPath extends string = string,
  TParams = RouteDefaultParams<TPath>,
  TQuery = Record<string, string | string[]>,
  TBody = unknown,
  TRouteServices = {},
  TRouteState = {},
  TReturns = undefined,
  TParamsIn = TParams,
  TQueryIn = TQuery,
  TBodyIn = TBody,
> {
  public readonly middlewares: MiddlewareDefinition<any, any, any, any, any>[] = [];
  public readonly schemas: RouteSchemas = {};

  constructor(
    public readonly method: TMethod,
    public readonly path: TPath,
  ) {}

  params<TSchema extends StandardSchemaV1>(
    schema: TSchema,
  ): RouteValidationBuilder<
    TMethod,
    TPath,
    StandardSchemaV1.InferOutput<TSchema>,
    TQuery,
    TBody,
    TRouteServices,
    TRouteState,
    TReturns,
    StandardSchemaV1.InferInput<TSchema>,
    TQueryIn,
    TBodyIn
  > {
    this.schemas.params = schema;
    return this as unknown as RouteValidationBuilder<
      TMethod,
      TPath,
      StandardSchemaV1.InferOutput<TSchema>,
      TQuery,
      TBody,
      TRouteServices,
      TRouteState,
      TReturns,
      StandardSchemaV1.InferInput<TSchema>,
      TQueryIn,
      TBodyIn
    >;
  }

  query<TSchema extends StandardSchemaV1>(
    schema: TSchema,
  ): RouteValidationBuilder<
    TMethod,
    TPath,
    TParams,
    StandardSchemaV1.InferOutput<TSchema>,
    TBody,
    TRouteServices,
    TRouteState,
    TReturns,
    TParamsIn,
    StandardSchemaV1.InferInput<TSchema>,
    TBodyIn
  > {
    this.schemas.query = schema;
    return this as unknown as RouteValidationBuilder<
      TMethod,
      TPath,
      TParams,
      StandardSchemaV1.InferOutput<TSchema>,
      TBody,
      TRouteServices,
      TRouteState,
      TReturns,
      TParamsIn,
      StandardSchemaV1.InferInput<TSchema>,
      TBodyIn
    >;
  }

  body<TSchema extends StandardSchemaV1>(
    schema: TSchema,
    mode?: BodyMode,
  ): RouteValidationBuilder<
    TMethod,
    TPath,
    TParams,
    TQuery,
    StandardSchemaV1.InferOutput<TSchema>,
    TRouteServices,
    TRouteState,
    TReturns,
    TParamsIn,
    TQueryIn,
    StandardSchemaV1.InferInput<TSchema>
  > {
    this.schemas.body = { schema, mode };
    return this as unknown as RouteValidationBuilder<
      TMethod,
      TPath,
      TParams,
      TQuery,
      StandardSchemaV1.InferOutput<TSchema>,
      TRouteServices,
      TRouteState,
      TReturns,
      TParamsIn,
      TQueryIn,
      StandardSchemaV1.InferInput<TSchema>
    >;
  }

  returns<const TMap extends Record<StatusCode, StandardSchemaV1>>(
    map: TMap,
  ): RouteValidationBuilder<
    TMethod,
    TPath,
    TParams,
    TQuery,
    TBody,
    TRouteServices,
    TRouteState,
    TReturns extends Record<StatusCode, StandardSchemaV1> ? TReturns & TMap : TMap,
    TParamsIn,
    TQueryIn,
    TBodyIn
  > {
    this.schemas.returns = { ...this.schemas.returns, ...map };
    return this as unknown as RouteValidationBuilder<
      TMethod,
      TPath,
      TParams,
      TQuery,
      TBody,
      TRouteServices,
      TRouteState,
      TReturns extends Record<StatusCode, StandardSchemaV1> ? TReturns & TMap : TMap,
      TParamsIn,
      TQueryIn,
      TBodyIn
    >;
  }

  handler<
    TReturn extends [TReturns] extends [undefined]
      ? any
      : [TReturns] extends [never]
        ? any
        : unknown extends TReturns
          ? any
          : InferReturnsResponse<TReturns> | Promise<InferReturnsResponse<TReturns>>,
  >(
    fn: RouteHandler<
      InferEffectiveParams<TPath, TMethod, TParams>,
      [TQuery] extends [Record<string, string | string[]>]
        ? [keyof InferRouteQuery<TPath, TMethod>] extends [never]
          ? TQuery
          : Overwrite<TQuery, InferRouteQuery<TPath, TMethod>>
        : TQuery,
      unknown extends TBody
        ? [keyof InferRouteBody<TPath, TMethod>] extends [never]
          ? unknown
          : InferRouteBody<TPath, TMethod>
        : TBody,
      InferRouteServices<TPath, TMethod> & TRouteServices,
      InferRouteState<TPath, TMethod> & TRouteState,
      TReturn
    >,
  ): RouteDefinition<
    TPath,
    TParams,
    TQuery,
    TBody,
    TReturns,
    TReturn,
    TParamsIn,
    TQueryIn,
    TBodyIn
  > {
    return {
      kind: "route",
      method: this.method,
      path: this.path,
      middlewares: [...this.middlewares],
      handler: fn as RouteHandler<any, any, any, any, any>,
      schemas: { ...this.schemas },
      returns: this.schemas.returns ? { ...this.schemas.returns } : undefined,
    } as unknown as RouteDefinition<
      TPath,
      TParams,
      TQuery,
      TBody,
      TReturns,
      TReturn,
      TParamsIn,
      TQueryIn,
      TBodyIn
    >;
  }
}

export class RouteBuilder<
  TMethod extends HttpMethod = HttpMethod,
  TPath extends string = string,
  TParams = RouteDefaultParams<TPath>,
  TQuery = Record<string, string | string[]>,
  TBody = unknown,
  TRouteServices = {},
  TRouteState = {},
  TReturns = undefined,
  TParamsIn = TParams,
  TQueryIn = TQuery,
  TBodyIn = TBody,
> extends RouteValidationBuilder<
  TMethod,
  TPath,
  TParams,
  TQuery,
  TBody,
  TRouteServices,
  TRouteState,
  TReturns,
  TParamsIn,
  TQueryIn,
  TBodyIn
> {
  constructor(method: TMethod, path: TPath) {
    super(method, path);
  }

  use<
    TMw extends
      | MiddlewareDefinition<any, any, any, any, any>
      | ((
          args: MiddlewareArgs<
            InferRouteServices<TPath, TMethod> & TRouteServices,
            InferRouteState<TPath, TMethod> & TRouteState,
            [TParams] extends [never]
              ? Record<string, string>
              : unknown extends TParams
                ? Record<string, string>
                : TParams,
            [TQuery] extends [never]
              ? Record<string, string | string[]>
              : unknown extends TQuery
                ? Record<string, string | string[]>
                : TQuery,
            TBody
          >,
          next: NextFunction,
        ) => any),
  >(
    middleware: TMw,
  ): RouteBuilder<
    TMethod,
    TPath,
    Overwrite<TParams, ExtractParamsFromMiddleware<TMw>>,
    Overwrite<TQuery, ExtractQueryFromMiddleware<TMw>>,
    Overwrite<TBody, ExtractBodyFromMiddleware<TMw>>,
    TRouteServices & InferServicesFromMw<TMw>,
    TRouteState & InferStateFromMw<TMw>,
    TReturns,
    TParamsIn,
    TQueryIn,
    TBodyIn
  > {
    this.middlewares.push(toMiddlewareDefinition(middleware));
    return this as unknown as RouteBuilder<
      TMethod,
      TPath,
      Overwrite<TParams, ExtractParamsFromMiddleware<TMw>>,
      Overwrite<TQuery, ExtractQueryFromMiddleware<TMw>>,
      Overwrite<TBody, ExtractBodyFromMiddleware<TMw>>,
      TRouteServices & InferServicesFromMw<TMw>,
      TRouteState & InferStateFromMw<TMw>,
      TReturns,
      TParamsIn,
      TQueryIn,
      TBodyIn
    >;
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

import type { StandardSchemaV1 } from "@standard-schema/spec";
import { hono } from "./hono.js";
import { defineTaser } from "./taser.js";
import type {
  BodyMode,
  ExtractBodyFromMiddleware,
  ExtractLayoutIdFromMiddleware,
  ExtractParamsFromMiddleware,
  ExtractPreconditionsFromMiddleware,
  ExtractQueryFromMiddleware,
  HttpMethod,
  HttpNoBodyMethod,
  InferEffectiveBody,
  InferEffectiveParams,
  InferEffectiveQuery,
  InferLayoutBody,
  InferLayoutBranchParams,
  InferLayoutBranchServices,
  InferLayoutBranchState,
  InferLayoutParams,
  InferLayoutQuery,
  InferLayoutServices,
  InferLayoutState,
  InferMiddlewareArgs,
  InferReturnsResponse,
  InferRouteServices,
  InferRouteState,
  InferServicesFromMw,
  InferStateFromMw,
  LayoutDefinition,
  MiddlewareArgs,
  MiddlewareDefinition,
  MiddlewareHandler,
  MiddlewarePreconditions,
  MiddlewareResponse,
  NextFunction,
  Overwrite,
  RegisteredRoutePath,
  RegisteredLayoutId,
  RouteDefaultParams,
  RouteDefinition,
  RouteHandler,
  RouteSchemas,
  StatusCode,
  ValidateLayoutMiddlewareUse,
  ValidateRouteMiddlewareUse,
} from "./types.js";

export function toMiddlewareDefinition<TMw>(
  input: TMw,
): TMw extends MiddlewareDefinition<any, any, any, any, any, any, any>
  ? TMw
  : MiddlewareDefinition<
      InferServicesFromMw<TMw>,
      InferStateFromMw<TMw>,
      ExtractParamsFromMiddleware<TMw>,
      ExtractQueryFromMiddleware<TMw>,
      ExtractBodyFromMiddleware<TMw>,
      ExtractLayoutIdFromMiddleware<TMw>,
      ExtractPreconditionsFromMiddleware<TMw>
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
  TServices = {},
  TState = {},
  TLayoutId extends string | undefined = undefined,
  TRequires extends MiddlewarePreconditions = {},
> implements MiddlewareDefinition<TServices, TState, TParams, TQuery, TBody, TLayoutId, TRequires> {
  public readonly kind = "middleware" as const;
  public readonly schemas: RouteSchemas = {};
  public readonly layoutId?: string | undefined;

  readonly _services?: TServices;
  readonly _state?: TState;
  readonly _params?: TParams;
  readonly _query?: TQuery;
  readonly _body?: TBody;
  readonly _layoutId?: TLayoutId;
  readonly _requires?: TRequires;

  constructor(layoutId?: string | undefined) {
    this.layoutId = layoutId;
    this.handler = this.handler.bind(this);
  }

  requires<TPreconditions extends MiddlewarePreconditions>(): MiddlewareBuilder<
    TParams,
    TQuery,
    TBody,
    TServices,
    TState,
    TLayoutId,
    TRequires & TPreconditions
  > {
    return this as unknown as MiddlewareBuilder<
      TParams,
      TQuery,
      TBody,
      TServices,
      TState,
      TLayoutId,
      TRequires & TPreconditions
    >;
  }

  params<TSchema extends StandardSchemaV1>(
    schema: TSchema,
  ): MiddlewareBuilder<
    StandardSchemaV1.InferOutput<TSchema>,
    TQuery,
    TBody,
    TServices,
    TState,
    TLayoutId,
    TRequires
  > {
    this.schemas.params = schema;
    return this as unknown as MiddlewareBuilder<
      StandardSchemaV1.InferOutput<TSchema>,
      TQuery,
      TBody,
      TServices,
      TState,
      TLayoutId,
      TRequires
    >;
  }

  query<TSchema extends StandardSchemaV1>(
    schema: TSchema,
  ): MiddlewareBuilder<
    TParams,
    StandardSchemaV1.InferOutput<TSchema>,
    TBody,
    TServices,
    TState,
    TLayoutId,
    TRequires
  > {
    this.schemas.query = schema;
    return this as unknown as MiddlewareBuilder<
      TParams,
      StandardSchemaV1.InferOutput<TSchema>,
      TBody,
      TServices,
      TState,
      TLayoutId,
      TRequires
    >;
  }

  body<TSchema extends StandardSchemaV1>(
    schema: TSchema,
    mode?: BodyMode,
  ): MiddlewareBuilder<
    TParams,
    TQuery,
    StandardSchemaV1.InferOutput<TSchema>,
    TServices,
    TState,
    TLayoutId,
    TRequires
  > {
    this.schemas.body = { schema, mode };
    return this as unknown as MiddlewareBuilder<
      TParams,
      TQuery,
      StandardSchemaV1.InferOutput<TSchema>,
      TServices,
      TState,
      TLayoutId,
      TRequires
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
      args: InferMiddlewareArgs<TLayoutId, TParams, TQuery, TBody, TRequires>,
      next: NextFunction,
    ) => any,
  >(
    fn: F,
  ): MiddlewareDefinition<
    InferServicesFromMw<F>,
    InferStateFromMw<F>,
    TParams,
    TQuery,
    TBody,
    TLayoutId,
    TRequires
  >;
  handler(arg1?: any, arg2?: any): any {
    if (typeof arg1 === "function" && arg2 === undefined) {
      return {
        kind: "middleware",
        layoutId: this.layoutId,
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

export function middleware<
  TLayoutId extends RegisteredLayoutId,
  F extends (
    args: MiddlewareArgs<
      InferLayoutBranchServices<TLayoutId>,
      InferLayoutBranchState<TLayoutId>,
      InferLayoutBranchParams<TLayoutId>
    >,
    next: NextFunction,
  ) => any,
>(
  layoutId: TLayoutId,
  fn: F,
): MiddlewareDefinition<
  InferServicesFromMw<F>,
  InferStateFromMw<F>,
  InferLayoutBranchParams<TLayoutId>,
  unknown,
  unknown,
  TLayoutId,
  {}
>;
export function middleware<TLayoutId extends RegisteredLayoutId>(
  layoutId: TLayoutId,
): MiddlewareBuilder<InferLayoutBranchParams<TLayoutId>, unknown, unknown, {}, {}, TLayoutId, {}>;
export function middleware<F extends (args: MiddlewareArgs<{}, {}>, next: NextFunction) => any>(
  fn: F,
): MiddlewareDefinition<
  InferServicesFromMw<F>,
  InferStateFromMw<F>,
  unknown,
  unknown,
  unknown,
  undefined,
  {}
>;
export function middleware(): MiddlewareBuilder<unknown, unknown, unknown, {}, {}, undefined, {}>;
export function middleware(
  arg1?: any,
  arg2?: any,
):
  | MiddlewareBuilder<any, any, any, any, any, any, any>
  | MiddlewareDefinition<any, any, any, any, any, any, any> {
  if (typeof arg1 === "string") {
    if (typeof arg2 === "function") {
      return {
        kind: "middleware",
        layoutId: arg1,
        handler: arg2 as MiddlewareHandler,
      };
    }
    return new MiddlewareBuilder(arg1);
  }
  if (typeof arg1 === "function") {
    return {
      kind: "middleware",
      handler: arg1 as MiddlewareHandler,
    };
  }
  return new MiddlewareBuilder();
}

export class LayoutBuilder<
  TPath extends string = string,
  TParams = RouteDefaultParams<TPath>,
  TServices = {},
  TState = {},
  TQuery = {},
  TBody = {},
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
    F extends (
      args: MiddlewareArgs<
        InferLayoutServices<TPath> & TServices,
        InferLayoutState<TPath> & TState,
        [keyof InferLayoutParams<TPath>] extends [never]
          ? TParams
          : Overwrite<InferLayoutParams<TPath>, TParams>,
        Overwrite<InferLayoutQuery<TPath>, TQuery>,
        Overwrite<InferLayoutBody<TPath>, TBody>
      >,
      next: NextFunction,
    ) => any,
  >(
    middleware: ValidateLayoutMiddlewareUse<
      TPath,
      [keyof InferLayoutParams<TPath>] extends [never]
        ? TParams
        : Overwrite<InferLayoutParams<TPath>, TParams>,
      Overwrite<InferLayoutQuery<TPath>, TQuery>,
      Overwrite<InferLayoutBody<TPath>, TBody>,
      TServices,
      TState,
      F
    >,
  ): LayoutBuilder<
    TPath,
    Overwrite<TParams, ExtractParamsFromMiddleware<F>>,
    TServices & InferServicesFromMw<F>,
    TState & InferStateFromMw<F>,
    Overwrite<TQuery, ExtractQueryFromMiddleware<F>>,
    Overwrite<TBody, ExtractBodyFromMiddleware<F>>
  >;
  use<M extends MiddlewareDefinition<any, any, any, any, any, any, any>>(
    middleware: ValidateLayoutMiddlewareUse<
      TPath,
      [keyof InferLayoutParams<TPath>] extends [never]
        ? TParams
        : Overwrite<InferLayoutParams<TPath>, TParams>,
      Overwrite<InferLayoutQuery<TPath>, TQuery>,
      Overwrite<InferLayoutBody<TPath>, TBody>,
      TServices,
      TState,
      M
    >,
  ): LayoutBuilder<
    TPath,
    Overwrite<TParams, ExtractParamsFromMiddleware<M>>,
    TServices & InferServicesFromMw<M>,
    TState & InferStateFromMw<M>,
    Overwrite<TQuery, ExtractQueryFromMiddleware<M>>,
    Overwrite<TBody, ExtractBodyFromMiddleware<M>>
  >;
  use(middleware: any): any {
    this.middlewares.push(toMiddlewareDefinition(middleware));
    return this;
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
  TQuery = {},
  TBody = [TMethod] extends [HttpNoBodyMethod] ? never : {},
  TRouteServices = {},
  TRouteState = {},
  TReturns = undefined,
  TParamsIn = TParams,
  TQueryIn = TQuery,
  TBodyIn = TBody,
> {
  public readonly middlewares: MiddlewareDefinition<any, any, any, any, any, any, any>[] = [];
  public readonly schemas: RouteSchemas = {};

  constructor(
    public readonly method: TMethod,
    public readonly path: TPath,
    public readonly methods?: readonly string[] | undefined,
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
    this: [TMethod] extends [HttpNoBodyMethod] ? never : any,
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
    (this as any).schemas.body = { schema, mode };
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
    TReturn extends ([TReturns] extends [undefined]
      ? any
      : [TReturns] extends [never]
        ? any
        : unknown extends TReturns
          ? any
          : InferReturnsResponse<TReturns> | Promise<InferReturnsResponse<TReturns>>),
  >(
    fn: RouteHandler<
      InferEffectiveParams<TPath, TMethod, TParams>,
      InferEffectiveQuery<TPath, TMethod, TQuery>,
      InferEffectiveBody<TPath, TMethod, TBody>,
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
      methods: this.methods,
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
  TQuery = {},
  TBody = [TMethod] extends [HttpNoBodyMethod] ? never : {},
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
  constructor(method: TMethod, path: TPath, methods?: readonly string[] | undefined) {
    super(method, path, methods);
  }

  use<
    F extends (
      args: MiddlewareArgs<
        InferRouteServices<TPath, TMethod> & TRouteServices,
        InferRouteState<TPath, TMethod> & TRouteState,
        InferEffectiveParams<TPath, TMethod, TParams>,
        InferEffectiveQuery<TPath, TMethod, TQuery>,
        InferEffectiveBody<TPath, TMethod, TBody>
      >,
      next: NextFunction,
    ) => any,
  >(
    middleware: ValidateRouteMiddlewareUse<
      TPath,
      TMethod,
      InferEffectiveParams<TPath, TMethod, TParams>,
      InferEffectiveQuery<TPath, TMethod, TQuery>,
      InferEffectiveBody<TPath, TMethod, TBody>,
      TRouteServices,
      TRouteState,
      F
    >,
  ): RouteBuilder<
    TMethod,
    TPath,
    Overwrite<TParams, ExtractParamsFromMiddleware<F>>,
    Overwrite<TQuery, ExtractQueryFromMiddleware<F>>,
    Overwrite<TBody, ExtractBodyFromMiddleware<F>>,
    TRouteServices & InferServicesFromMw<F>,
    TRouteState & InferStateFromMw<F>,
    TReturns,
    TParamsIn,
    TQueryIn,
    TBodyIn
  >;
  use<M extends MiddlewareDefinition<any, any, any, any, any, any, any>>(
    middleware: ValidateRouteMiddlewareUse<
      TPath,
      TMethod,
      InferEffectiveParams<TPath, TMethod, TParams>,
      InferEffectiveQuery<TPath, TMethod, TQuery>,
      InferEffectiveBody<TPath, TMethod, TBody>,
      TRouteServices,
      TRouteState,
      M
    >,
  ): RouteBuilder<
    TMethod,
    TPath,
    Overwrite<TParams, ExtractParamsFromMiddleware<M>>,
    Overwrite<TQuery, ExtractQueryFromMiddleware<M>>,
    Overwrite<TBody, ExtractBodyFromMiddleware<M>>,
    TRouteServices & InferServicesFromMw<M>,
    TRouteState & InferStateFromMw<M>,
    TReturns,
    TParamsIn,
    TQueryIn,
    TBodyIn
  >;
  use(middleware: any): any {
    this.middlewares.push(toMiddlewareDefinition(middleware));
    return this;
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
  options: <TPath extends RegisteredRoutePath>(path: TPath) =>
    new RouteBuilder<"OPTIONS", TPath>("OPTIONS", path),
  query: <TPath extends RegisteredRoutePath>(path: TPath) =>
    new RouteBuilder<"QUERY", TPath>("QUERY", path),
  all: <TPath extends RegisteredRoutePath>(path: TPath) =>
    new RouteBuilder<"ALL", TPath>("ALL", path),
  any: <TPath extends RegisteredRoutePath, const TMethods extends readonly string[]>(
    path: TPath,
    methods: TMethods,
  ) =>
    new RouteBuilder<"ANY", TPath>(
      "ANY",
      path,
      methods.map((m) => m.toUpperCase()),
    ),
  layout,
  middleware,
  hono,
  app: defineTaser,
};

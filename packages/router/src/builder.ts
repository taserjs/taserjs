import type { StandardSchemaV1 } from "@standard-schema/spec";

import { hono } from "./hono.js";
import { defineTaser } from "./taser.js";
import type {
  BodyMode,
  DefaultRouteBody,
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
  InferLayoutBranchParams,
  InferLayoutBranchServices,
  InferLayoutBranchState,
  InferLayoutEffectiveBody,
  InferLayoutEffectiveParams,
  InferLayoutEffectiveQuery,
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
  NextFunction,
  Overwrite,
  RegisteredRoutePath,
  RegisteredLayoutId,
  RouteDefaultParams,
  RouteDefinition,
  RouteHandler,
  RouteSchemas,
  SanitizeRouteParams,
  StatusCode,
  ValidateLayoutMiddlewareUse,
  ValidateRouteMiddlewareUse,
  ValidateMiddlewareFn,
  ValidMiddlewareReturn,
} from "./types.js";

function createMiddlewareDefinition(
  handler: MiddlewareHandler,
  layoutId?: string | undefined,
  schemas?: RouteSchemas | undefined,
): MiddlewareDefinition<any, any, any, any, any, any, any> {
  return { kind: "middleware", handler, layoutId, schemas };
}

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
    return createMiddlewareDefinition(input as MiddlewareHandler) as any;
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

  readonly _services?: TServices;
  readonly _state?: TState;
  readonly _params?: TParams;
  readonly _query?: TQuery;
  readonly _body?: TBody;
  readonly _layoutId?: TLayoutId;
  readonly _requires?: TRequires;

  constructor(
    public readonly layoutId?: string | undefined,
    public readonly schemas: RouteSchemas = {},
  ) {
    this.handler = this.handler.bind(this);
  }

  // Builders are immutable so a reused builder never leaks state into the builders derived from it.
  // The generic parameters change with every call, hence the `any` return type.
  private withSchemas(patch: RouteSchemas): any {
    return new MiddlewareBuilder(this.layoutId, { ...this.schemas, ...patch });
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
    return this.withSchemas({});
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
    return this.withSchemas({ params: schema });
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
    return this.withSchemas({ query: schema });
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
    return this.withSchemas({ body: { schema, mode } });
  }

  handler(args: MiddlewareArgs<any, any, any, any, any>, next: NextFunction): ValidMiddlewareReturn;
  handler<
    F extends (
      args: InferMiddlewareArgs<TLayoutId, TParams, TQuery, TBody, TRequires>,
      next: NextFunction,
    ) => any,
  >(
    fn: ValidateMiddlewareFn<F>,
  ): MiddlewareDefinition<
    InferServicesFromMw<F>,
    InferStateFromMw<F>,
    TParams,
    TQuery,
    TBody,
    TLayoutId,
    TRequires
  >;
  handler(arg1: any, arg2?: any): any {
    if (typeof arg1 === "function" && arg2 === undefined) {
      return createMiddlewareDefinition(
        arg1 as MiddlewareHandler,
        this.layoutId,
        Object.keys(this.schemas).length > 0 ? { ...this.schemas } : undefined,
      );
    }
    // Invoked as a middleware itself: a builder without a handler only carries schemas.
    return Promise.resolve(arg2());
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
  fn: ValidateMiddlewareFn<F>,
): MiddlewareDefinition<
  InferServicesFromMw<F>,
  InferStateFromMw<F>,
  unknown,
  unknown,
  unknown,
  TLayoutId,
  {}
>;
export function middleware<TLayoutId extends RegisteredLayoutId>(
  layoutId: TLayoutId,
): MiddlewareBuilder<unknown, unknown, unknown, {}, {}, TLayoutId, {}>;
export function middleware<F extends (args: MiddlewareArgs<{}, {}>, next: NextFunction) => any>(
  fn: ValidateMiddlewareFn<F>,
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
      return createMiddlewareDefinition(arg2 as MiddlewareHandler, arg1);
    }
    return new MiddlewareBuilder(arg1);
  }
  if (typeof arg1 === "function") {
    return createMiddlewareDefinition(arg1 as MiddlewareHandler);
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

  readonly _services?: TServices;
  readonly _state?: TState;
  readonly _params?: TParams;
  readonly _query?: TQuery;
  readonly _body?: TBody;

  constructor(
    public readonly path: TPath,
    public readonly middlewares: MiddlewareDefinition<any, any, any, any, any>[] = [],
    public readonly schemas: RouteSchemas = {},
  ) {}

  // Builders are immutable so a reused builder never leaks state into the layouts derived from it.
  // The generic parameters change with every call, hence the `any` return type.
  private withSchemas(patch: RouteSchemas): any {
    const schemaMiddleware: MiddlewareDefinition<any, any, any, any, any> = {
      kind: "middleware",
      handler: async (_args, next) => next(),
      schemas: patch,
    };
    return new LayoutBuilder(this.path, [...this.middlewares, schemaMiddleware], {
      ...this.schemas,
      ...patch,
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
    return this.withSchemas({ params: schema });
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
    return this.withSchemas({ query: schema });
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
    return this.withSchemas({ body: { schema, mode } });
  }

  use<
    F extends (
      args: MiddlewareArgs<
        InferLayoutServices<TPath> & TServices,
        InferLayoutState<TPath> & TState,
        InferLayoutEffectiveParams<TPath, TParams>,
        InferLayoutEffectiveQuery<TPath, TQuery>,
        InferLayoutEffectiveBody<TPath, TBody>
      >,
      next: NextFunction,
    ) => any,
  >(
    middleware: ValidateLayoutMiddlewareUse<
      TPath,
      InferLayoutEffectiveParams<TPath, TParams>,
      InferLayoutEffectiveQuery<TPath, TQuery>,
      InferLayoutEffectiveBody<TPath, TBody>,
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
      InferLayoutEffectiveParams<TPath, TParams>,
      InferLayoutEffectiveQuery<TPath, TQuery>,
      InferLayoutEffectiveBody<TPath, TBody>,
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
    return new LayoutBuilder(this.path, [...this.middlewares, toMiddlewareDefinition(middleware)], {
      ...this.schemas,
    });
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
  TBody = DefaultRouteBody<TMethod>,
  TRouteServices = {},
  TRouteState = {},
  TReturns = undefined,
  TParamsIn = TParams,
  TQueryIn = TQuery,
  TBodyIn = TBody,
> {
  constructor(
    public readonly method: TMethod,
    public readonly path: TPath,
    public readonly methods?: readonly string[] | undefined,
    public readonly middlewares: MiddlewareDefinition<any, any, any, any, any, any, any>[] = [],
    public readonly schemas: RouteSchemas = {},
  ) {}

  // Builders are immutable so a reused builder never leaks state into the routes derived from it.
  // The generic parameters change with every call, hence the `any` return type.
  private withSchemas(patch: RouteSchemas): any {
    return new RouteValidationBuilder(this.method, this.path, this.methods, [...this.middlewares], {
      ...this.schemas,
      ...patch,
    });
  }

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
    return this.withSchemas({ params: schema });
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
    return this.withSchemas({ query: schema });
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
    return (this as RouteValidationBuilder).withSchemas({ body: { schema, mode } });
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
    return this.withSchemas({ returns: { ...this.schemas.returns, ...map } });
  }

  handler<TReturn extends InferReturnsResponse<TReturns> | Promise<InferReturnsResponse<TReturns>>>(
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
    SanitizeRouteParams<TPath, TParams>,
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
      SanitizeRouteParams<TPath, TParams>,
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
  TBody = DefaultRouteBody<TMethod>,
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
    SanitizeRouteParams<TPath, Overwrite<TParams, ExtractParamsFromMiddleware<F>>>,
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
    SanitizeRouteParams<TPath, Overwrite<TParams, ExtractParamsFromMiddleware<M>>>,
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
    return new RouteBuilder(
      this.method,
      this.path,
      this.methods,
      [...this.middlewares, toMiddlewareDefinition(middleware)],
      this.schemas,
    );
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
  any: <TPath extends RegisteredRoutePath>(path: TPath, methods: readonly string[]) =>
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

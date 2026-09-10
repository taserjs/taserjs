import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { BodyMode, ValidationFacet } from "@taserjs/utils";
import type { RequestHeader } from "hono/utils/headers";

export type { BodyMode, ValidationFacet, RequestHeader };
export type { StandardSchemaV1 };

export type HeaderKey = RequestHeader | (string & {});

export interface TaserHeaders extends Headers {
  get(name: HeaderKey): string | null;
  has(name: HeaderKey): boolean;
}

export type StatusCode = number;

export interface RouteBodySchema {
  readonly schema: StandardSchemaV1;
  readonly mode?: BodyMode | undefined;
}

export interface RouteSchemas {
  params?: StandardSchemaV1 | undefined;
  query?: StandardSchemaV1 | undefined;
  body?: RouteBodySchema | undefined;
  returns?: Record<StatusCode, StandardSchemaV1> | undefined;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

type ExtractParamName<T extends string> = T extends `:${infer P}` ? P : never;

type ExtractPathSegments<T extends string> = T extends `/${infer Rest}`
  ? ExtractPathSegments<Rest>
  : T extends `${infer Segment}/${infer Rest}`
    ? Segment | ExtractPathSegments<Rest>
    : T extends ""
      ? never
      : T;

type HasWildcard<T extends string> = T extends `${string}*${string}` ? true : false;

type ParamsFromSegments<T extends string> = {
  [K in ExtractPathSegments<T> as ExtractParamName<K>]: string;
};

export type RouteDefaultParams<TPath extends string = string> = string extends TPath
  ? Record<string, string>
  : (HasWildcard<TPath> extends true ? { _splat: string } : {}) & ParamsFromSegments<TPath>;

export interface TaserRequest<
  TParams = Record<string, string>,
  TQuery = Record<string, string | string[]>,
  TBody = unknown,
> {
  params: TParams;
  query: TQuery;
  headers: TaserHeaders;
  method: string;
  url: string;
  path: string;
  raw: Request;
  body?: TBody;
}

export interface RouterRegister {}

export type RegisteredRoutePath = RouterRegister extends { RoutePath: infer P extends string }
  ? [P] extends [never]
    ? string
    : P
  : string;

export type InferredAppContext = RouterRegister extends { AppContext: infer C }
  ? C
  : Record<string, unknown>;

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

export type SafeIntersect<U> = [U] extends [never] ? {} : UnionToIntersection<U>;

export type Overwrite<T, U> = unknown extends U
  ? T
  : [U] extends [never]
    ? T
    : Omit<T, keyof U> & U;

export type DistributeServices<T> = T extends { readonly _services?: infer S }
  ? [S] extends [never]
    ? {}
    : NonNullable<S>
  : {};

export type DistributeState<T> = T extends { readonly _state?: infer St }
  ? [St] extends [never]
    ? {}
    : NonNullable<St>
  : {};

export type InferServicesFromMw<T> = T extends (args: any, next: any) => infer R
  ? DistributeServices<Awaited<R>>
  : T extends { readonly _services?: infer S }
    ? [S] extends [never]
      ? {}
      : NonNullable<S>
    : {};

export type InferStateFromMw<T> = T extends (args: any, next: any) => infer R
  ? DistributeState<Awaited<R>>
  : T extends { readonly _state?: infer St }
    ? [St] extends [never]
      ? {}
      : NonNullable<St>
    : {};

export type ExtractServicesFromMiddleware<TMw> = TMw extends { readonly _services?: infer S }
  ? NonNullable<S>
  : TMw extends MiddlewareDefinition<infer S, any, any, any, any>
    ? NonNullable<S>
    : {};

export type ExtractStateFromMiddleware<TMw> = TMw extends { readonly _state?: infer St }
  ? NonNullable<St>
  : TMw extends MiddlewareDefinition<any, infer St, any, any, any>
    ? NonNullable<St>
    : {};

export type ExtractParamsFromMiddleware<TMw> = TMw extends { readonly _params?: infer P }
  ? [P] extends [never]
    ? {}
    : unknown extends P
      ? {}
      : NonNullable<P>
  : TMw extends MiddlewareDefinition<any, any, infer P, any, any>
    ? [P] extends [never]
      ? {}
      : unknown extends P
        ? {}
        : NonNullable<P>
    : {};

export type ExtractQueryFromMiddleware<TMw> = TMw extends { readonly _query?: infer Q }
  ? [Q] extends [never]
    ? {}
    : unknown extends Q
      ? {}
      : NonNullable<Q>
  : TMw extends MiddlewareDefinition<any, any, any, infer Q, any>
    ? [Q] extends [never]
      ? {}
      : unknown extends Q
        ? {}
        : NonNullable<Q>
    : {};

export type ExtractBodyFromMiddleware<TMw> = TMw extends { readonly _body?: infer B }
  ? [B] extends [never]
    ? unknown
    : unknown extends B
      ? unknown
      : NonNullable<B>
  : TMw extends MiddlewareDefinition<any, any, any, any, infer B>
    ? [B] extends [never]
      ? unknown
      : unknown extends B
        ? unknown
        : NonNullable<B>
    : unknown;

export type ExtractServicesFromLayout<TLayout> = TLayout extends { readonly _services?: infer S }
  ? NonNullable<S>
  : TLayout extends LayoutDefinition<any, infer S, any, any, any, any>
    ? NonNullable<S>
    : TLayout extends { readonly middlewares: readonly (infer M)[] }
      ? ExtractServicesFromMiddleware<M>
      : {};

export type ExtractStateFromLayout<TLayout> = TLayout extends { readonly _state?: infer St }
  ? NonNullable<St>
  : TLayout extends LayoutDefinition<any, any, infer St, any, any, any>
    ? NonNullable<St>
    : TLayout extends { readonly middlewares: readonly (infer M)[] }
      ? ExtractStateFromMiddleware<M>
      : {};

export type ExtractParamsFromLayout<TLayout> = TLayout extends { readonly _params?: infer P }
  ? [P] extends [never]
    ? {}
    : NonNullable<P>
  : TLayout extends LayoutDefinition<any, any, any, infer P, any, any>
    ? [P] extends [never]
      ? {}
      : NonNullable<P>
    : TLayout extends { readonly middlewares: readonly (infer M)[] }
      ? ExtractParamsFromMiddleware<M>
      : {};

export type ExtractQueryFromLayout<TLayout> = TLayout extends { readonly _query?: infer Q }
  ? [Q] extends [never]
    ? {}
    : NonNullable<Q>
  : TLayout extends LayoutDefinition<any, any, any, any, infer Q, any>
    ? [Q] extends [never]
      ? {}
      : NonNullable<Q>
    : TLayout extends { readonly middlewares: readonly (infer M)[] }
      ? ExtractQueryFromMiddleware<M>
      : {};

export type ExtractBodyFromLayout<TLayout> = TLayout extends { readonly _body?: infer B }
  ? [B] extends [never]
    ? {}
    : NonNullable<B>
  : TLayout extends LayoutDefinition<any, any, any, any, any, infer B>
    ? [B] extends [never]
      ? {}
      : NonNullable<B>
    : TLayout extends { readonly middlewares: readonly (infer M)[] }
      ? ExtractBodyFromMiddleware<M>
      : {};

type GetRouteLayoutIds<TPath extends string, TMethod extends HttpMethod> = RouterRegister extends {
  RouteByPathMethod: infer R;
}
  ? TPath extends keyof R
    ? TMethod extends keyof R[TPath]
      ? R[TPath][TMethod] extends { layouts: infer L }
        ? L extends readonly (infer Id)[]
          ? [Id] extends [string]
            ? Id
            : never
          : L extends (infer Id)[]
            ? [Id] extends [string]
              ? Id
              : never
            : never
        : never
      : never
    : never
  : never;

type GetLayoutServices<LId extends string> = [LId] extends [never]
  ? never
  : RouterRegister extends { LayoutTree: infer LT }
    ? LId extends keyof LT
      ? ExtractServicesFromLayout<LT[LId]>
      : {}
    : {};

type GetLayoutState<LId extends string> = [LId] extends [never]
  ? never
  : RouterRegister extends { LayoutTree: infer LT }
    ? LId extends keyof LT
      ? ExtractStateFromLayout<LT[LId]>
      : {}
    : {};

export type InferRouteServices<TPath extends string, TMethod extends HttpMethod> = SafeIntersect<
  GetLayoutServices<GetRouteLayoutIds<TPath, TMethod>>
>;

export type InferRouteState<TPath extends string, TMethod extends HttpMethod> = SafeIntersect<
  GetLayoutState<GetRouteLayoutIds<TPath, TMethod>>
>;

type GetLayoutParams<LId extends string> = [LId] extends [never]
  ? never
  : RouterRegister extends { LayoutTree: infer LT }
    ? LId extends keyof LT
      ? ExtractParamsFromLayout<LT[LId]>
      : {}
    : {};

type GetLayoutQuery<LId extends string> = [LId] extends [never]
  ? never
  : RouterRegister extends { LayoutTree: infer LT }
    ? LId extends keyof LT
      ? ExtractQueryFromLayout<LT[LId]>
      : {}
    : {};

type GetLayoutBody<LId extends string> = [LId] extends [never]
  ? never
  : RouterRegister extends { LayoutTree: infer LT }
    ? LId extends keyof LT
      ? ExtractBodyFromLayout<LT[LId]>
      : {}
    : {};

export type InferRouteParams<TPath extends string, TMethod extends HttpMethod> = SafeIntersect<
  GetLayoutParams<GetRouteLayoutIds<TPath, TMethod>>
>;

export type InferRouteQuery<TPath extends string, TMethod extends HttpMethod> = SafeIntersect<
  GetLayoutQuery<GetRouteLayoutIds<TPath, TMethod>>
>;

export type InferRouteBody<TPath extends string, TMethod extends HttpMethod> = SafeIntersect<
  GetLayoutBody<GetRouteLayoutIds<TPath, TMethod>>
>;

type GetParentLayoutIds<LId extends string> = RouterRegister extends {
  LayoutHierarchy: infer LH;
}
  ? LId extends keyof LH
    ? LH[LId] extends readonly (infer Id)[]
      ? [Id] extends [string]
        ? Id
        : never
      : never
    : never
  : never;

export type InferLayoutState<TPath extends string> = SafeIntersect<
  GetLayoutState<GetParentLayoutIds<TPath>>
>;

export type InferLayoutServices<TPath extends string> = SafeIntersect<
  GetLayoutServices<GetParentLayoutIds<TPath>>
>;

export type InferLayoutParams<TPath extends string> = SafeIntersect<
  GetLayoutParams<GetParentLayoutIds<TPath>>
>;

export type InferLayoutQuery<TPath extends string> = SafeIntersect<
  GetLayoutQuery<GetParentLayoutIds<TPath>>
>;

export type InferLayoutBody<TPath extends string> = SafeIntersect<
  GetLayoutBody<GetParentLayoutIds<TPath>>
>;

export type InferEffectiveParams<
  TPath extends string,
  TMethod extends HttpMethod,
  TRouteParams = unknown,
> = [keyof InferRouteParams<TPath, TMethod>] extends [never]
  ? TRouteParams
  : [TRouteParams] extends [RouteDefaultParams<TPath>]
    ? Overwrite<RouteDefaultParams<TPath>, InferRouteParams<TPath, TMethod>>
    : Overwrite<InferRouteParams<TPath, TMethod>, TRouteParams>;

export type RouteHandlerArgs<
  TParams = Record<string, string>,
  TQuery = Record<string, string | string[]>,
  TBody = unknown,
  TServices = {},
  TState = {},
> = {
  req: TaserRequest<TParams, TQuery, TBody>;
  ctx: InferredAppContext;
  state: [keyof TState] extends [never] ? {} : TState;
} & TServices;

export type RouteHandler<
  TParams = Record<string, string>,
  TQuery = Record<string, string | string[]>,
  TBody = unknown,
  TServices = {},
  TState = {},
  TReturn extends Response | Promise<Response> = Response | Promise<Response>,
> = (args: RouteHandlerArgs<TParams, TQuery, TBody, TServices, TState>) => TReturn;

export interface MiddlewareResponse<TServices = {}, TState = {}> extends Response {
  readonly _services?: TServices;
  readonly _state?: TState;
}

export interface NextFunction {
  <TState extends Record<string, unknown> = {}>(
    state?: TState,
  ): Promise<MiddlewareResponse<{}, TState>>;
  provide<TServices extends Record<string, unknown>, TState extends Record<string, unknown> = {}>(
    services: TServices,
    state?: TState,
  ): Promise<MiddlewareResponse<TServices, TState>>;
}

export type MiddlewareArgs<
  TServices = {},
  TState = {},
  TParams = Record<string, string>,
  TQuery = Record<string, string | string[]>,
  TBody = unknown,
> = {
  req: TaserRequest<TParams, TQuery, TBody>;
  ctx: InferredAppContext;
  state: [keyof TState] extends [never] ? Record<string, unknown> : TState;
} & TServices;

export type MiddlewareHandler<
  TServices = Record<string, any>,
  TState = Record<string, unknown>,
  TParams = Record<string, string>,
  TQuery = Record<string, string | string[]>,
  TBody = unknown,
> = (
  args: MiddlewareArgs<TServices, TState, TParams, TQuery, TBody>,
  next: NextFunction,
) =>
  | Response
  | Promise<Response>
  | MiddlewareResponse<any, any>
  | Promise<MiddlewareResponse<any, any>>;

export interface MiddlewareDefinition<
  TServices = {},
  TState = {},
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
> {
  readonly kind: "middleware";
  readonly handler: MiddlewareHandler<any, any, any, any, any>;
  readonly schemas?: RouteSchemas | undefined;
  readonly _services?: TServices;
  readonly _state?: TState;
  readonly _params?: TParams;
  readonly _query?: TQuery;
  readonly _body?: TBody;
}

export type MiddlewareInput = MiddlewareHandler | MiddlewareDefinition<any, any, any, any, any>;

export interface LayoutDefinition<
  TPath extends string = string,
  TServices = {},
  TState = {},
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
> {
  readonly kind: "layout";
  readonly path: TPath;
  readonly middlewares: readonly MiddlewareDefinition<any, any, any, any, any>[];
  readonly schemas?: RouteSchemas | undefined;
  readonly _services?: TServices;
  readonly _state?: TState;
  readonly _params?: TParams;
  readonly _query?: TQuery;
  readonly _body?: TBody;
}

export interface RouteDefinition<
  TPath extends string = string,
  TParams = any,
  TQuery = any,
  TBody = any,
  TReturns = any,
  THandlerReturn = any,
  TParamsIn = TParams,
  TQueryIn = TQuery,
  TBodyIn = TBody,
> {
  readonly kind: "route";
  readonly method: HttpMethod;
  readonly path: TPath;
  readonly middlewares?: readonly MiddlewareDefinition<any, any>[] | undefined;
  readonly handler: RouteHandler<any, any, any, any, any>;
  readonly schemas?: RouteSchemas | undefined;
  readonly returns?: Record<StatusCode, StandardSchemaV1> | undefined;
  readonly $Infer?: {
    Params: TParams;
    Query: TQuery;
    Body: TBody;
    ParamsIn: TParamsIn;
    QueryIn: TQueryIn;
    BodyIn: TBodyIn;
    Returns: TReturns;
    HandlerReturn: THandlerReturn;
    Input: {
      params: TParamsIn;
      query: TQueryIn;
      body: TBodyIn;
    };
    Output: TReturns;
  };
}

export interface ContextOptions<
  TBoot extends Record<string, unknown> = Record<string, unknown>,
  TRequest extends Record<string, unknown> = Record<string, unknown>,
> {
  boot?: (() => TBoot | Promise<TBoot>) | undefined;
  request?: ((req: TaserRequest) => TRequest | Promise<TRequest>) | undefined;
}

export interface ContextDefinition<
  TBoot extends Record<string, unknown> = Record<string, unknown>,
  TRequest extends Record<string, unknown> = Record<string, unknown>,
> extends ContextOptions<TBoot, TRequest> {
  readonly kind: "context";
}

export type NotFoundHandler<TContext = Record<string, unknown>> = (args: {
  req: TaserRequest;
  ctx: TContext;
}) => Response | Promise<Response>;

export type OnErrorHandler = (err: unknown, req: TaserRequest) => Response | Promise<Response>;

export interface TaserAppOptions<TContext = Record<string, unknown>> {
  basePath?: string | undefined;
  context?: ContextDefinition<any, any> | undefined;
  notFound?: NotFoundHandler<TContext> | undefined;
  onError?: OnErrorHandler | undefined;
}

export interface TaserDefinition<TContext = Record<string, unknown>> {
  readonly _context?: TContext;
  readonly $Infer: {
    Context: TContext;
  };
  readonly options: TaserAppOptions<TContext>;
}

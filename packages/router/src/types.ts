import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { BodyMode, TypedResponse, ValidationFacet } from "@taserjs/utils";
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

export type StandardHttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD"
  | "QUERY";

export type HttpMethod = StandardHttpMethod | "ALL" | "ANY";
export type HttpNoBodyMethod = "GET" | "HEAD";

export type Simplify<T> = unknown extends T
  ? T
  : T extends (...args: any[]) => any
    ? T
    : T extends readonly any[]
      ? T
      : { [K in keyof T]: T[K] } & {};

type ExtractParamName<T extends string> = T extends `:${infer P}` ? P : never;

type ExtractPathSegments<T extends string> = T extends `/${infer Rest}`
  ? ExtractPathSegments<Rest>
  : T extends `${infer Segment}/${infer Rest}`
    ? Segment | ExtractPathSegments<Rest>
    : T extends ""
      ? never
      : T;

type HasWildcard<T extends string> = string extends T
  ? false
  : T extends `${string}*${string}`
    ? true
    : false;

type ParamsFromSegments<T extends string> = Simplify<{
  [K in ExtractPathSegments<T> as ExtractParamName<K>]: string;
}>;

export type RouteDefaultParams<TPath extends string = string> = string extends TPath
  ? Record<string, string>
  : Simplify<
      (HasWildcard<TPath> extends true ? { _splat: string } : {}) &
        ParamsFromSegments<TPath>
    >;

export interface TaserRequest<
  TParams = {},
  TQuery = {},
  TBody = unknown,
> {
  params: Simplify<TParams>;
  query: Simplify<TQuery>;
  headers: TaserHeaders;
  method: string;
  url: string;
  path: string;
  raw: Request;
  body: TBody;
}

export interface RouterRegister {}

export type RegisteredRoutePath = RouterRegister extends { RoutePath: infer P extends string }
  ? [P] extends [never]
    ? string
    : P
  : string;

export type RegisteredLayoutId = RouterRegister extends { LayoutTree: infer LT }
  ? [keyof LT] extends [never]
    ? never
    : keyof LT & string
  : never;

export type InferredAppContext = RouterRegister extends { AppContext: infer C }
  ? C
  : {};

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

export type SafeIntersect<U> = [U] extends [never] ? {} : Simplify<UnionToIntersection<U>>;

export type Overwrite<T, U> = unknown extends U
  ? T
  : [U] extends [never]
    ? T
    : Simplify<Omit<T, keyof U> & U>;

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

type NormalizeFacet<T> = unknown extends T
  ? {}
  : [T] extends [never]
    ? {}
    : NonNullable<T>;

export type ExtractParamsFromLayout<TLayout> = TLayout extends { readonly _params?: infer P }
  ? NormalizeFacet<P>
  : TLayout extends LayoutDefinition<any, any, any, infer P, any, any>
    ? NormalizeFacet<P>
    : TLayout extends { readonly middlewares: readonly (infer M)[] }
      ? ExtractParamsFromMiddleware<M>
      : {};

export type ExtractQueryFromLayout<TLayout> = TLayout extends { readonly _query?: infer Q }
  ? NormalizeFacet<Q>
  : TLayout extends LayoutDefinition<any, any, any, any, infer Q, any>
    ? NormalizeFacet<Q>
    : TLayout extends { readonly middlewares: readonly (infer M)[] }
      ? ExtractQueryFromMiddleware<M>
      : {};

export type ExtractBodyFromLayout<TLayout> = TLayout extends { readonly _body?: infer B }
  ? NormalizeFacet<B>
  : TLayout extends LayoutDefinition<any, any, any, any, any, infer B>
    ? NormalizeFacet<B>
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

export type InferRouteParams<TPath extends string, TMethod extends HttpMethod> = Simplify<
  Omit<
    SafeIntersect<GetLayoutParams<GetRouteLayoutIds<TPath, TMethod>>>,
    "_splat"
  >
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

export type InferLayoutParams<TPath extends string> = Simplify<
  Omit<
    SafeIntersect<GetLayoutParams<GetParentLayoutIds<TPath>>>,
    "_splat"
  >
>;

export type InferLayoutQuery<TPath extends string> = SafeIntersect<
  GetLayoutQuery<GetParentLayoutIds<TPath>>
>;

export type InferLayoutBody<TPath extends string> = SafeIntersect<
  GetLayoutBody<GetParentLayoutIds<TPath>>
>;

export type InferLayoutBranchState<LId extends string | undefined> = [LId] extends [undefined]
  ? {}
  : [LId] extends [never]
    ? {}
    : SafeIntersect<
        GetLayoutState<NonNullable<LId> | GetParentLayoutIds<NonNullable<LId>>>
      >;

export type InferLayoutBranchServices<LId extends string | undefined> = [LId] extends [undefined]
  ? {}
  : [LId] extends [never]
    ? {}
    : SafeIntersect<
        GetLayoutServices<NonNullable<LId> | GetParentLayoutIds<NonNullable<LId>>>
      >;

export type InferLayoutBranchParams<LId extends string | undefined> = Simplify<
  [LId] extends [undefined]
    ? { _splat: string }
    : [LId] extends [never]
      ? { _splat: string }
      : RouteDefaultParams<NonNullable<LId>> &
          SafeIntersect<
            GetLayoutParams<NonNullable<LId> | GetParentLayoutIds<NonNullable<LId>>>
          >
>;

export interface MiddlewarePreconditions {
  state?: Record<string, any> | undefined;
  services?: Record<string, any> | undefined;
  params?: Record<string, any> | undefined;
  query?: Record<string, any> | undefined;
  body?: any;
}

export type InferEffectiveParams<
  TPath extends string,
  TMethod extends HttpMethod,
  TRouteParams = unknown,
> = Simplify<
  (HasWildcard<TPath> extends true ? { _splat: string } : {}) &
    ([keyof InferRouteParams<TPath, TMethod>] extends [never]
      ? TRouteParams
      : [TRouteParams] extends [RouteDefaultParams<TPath>]
        ? Overwrite<RouteDefaultParams<TPath>, InferRouteParams<TPath, TMethod>>
        : Overwrite<InferRouteParams<TPath, TMethod>, TRouteParams>)
>;

export type InferEffectiveQuery<
  TPath extends string,
  TMethod extends HttpMethod,
  TRouteQuery = unknown,
> = Simplify<Overwrite<InferRouteQuery<TPath, TMethod>, TRouteQuery>>;

export type InferEffectiveBody<
  TPath extends string,
  TMethod extends HttpMethod,
  TRouteBody = unknown,
> = [TMethod] extends [HttpNoBodyMethod]
  ? never
  : Simplify<Overwrite<InferRouteBody<TPath, TMethod>, TRouteBody>>;

export type RouteHandlerArgs<
  TParams = {},
  TQuery = {},
  TBody = unknown,
  TServices = {},
  TState = {},
> = Simplify<
  {
    req: Simplify<TaserRequest<Simplify<TParams>, Simplify<TQuery>, TBody>>;
    ctx: InferredAppContext;
    state: [keyof TState] extends [never] ? {} : Simplify<TState>;
  } & TServices
>;

export type RouteHandler<
  TParams = {},
  TQuery = {},
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
  TParams = {},
  TQuery = {},
  TBody = unknown,
> = Simplify<
  {
    req: Simplify<TaserRequest<Simplify<TParams & { _splat: string }>, Simplify<TQuery>, TBody>>;
    ctx: InferredAppContext;
    state: [keyof TState] extends [never] ? Record<string, unknown> : Simplify<TState>;
  } & TServices
>;

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
  TLayoutId extends string | undefined = undefined,
  TRequires extends MiddlewarePreconditions = {},
> {
  readonly kind: "middleware";
  readonly handler: MiddlewareHandler<any, any, any, any, any>;
  readonly schemas?: RouteSchemas | undefined;
  readonly layoutId?: string | undefined;
  readonly _services?: TServices;
  readonly _state?: TState;
  readonly _params?: TParams;
  readonly _query?: TQuery;
  readonly _body?: TBody;
  readonly _layoutId?: TLayoutId;
  readonly _requires?: TRequires;
}

export type MiddlewareInput = MiddlewareHandler | MiddlewareDefinition<any, any, any, any, any, any, any>;

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
  readonly middlewares: readonly MiddlewareDefinition<any, any, any, any, any, any, any>[];
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
  readonly methods?: readonly string[] | undefined;
  readonly path: TPath;
  readonly middlewares?: readonly MiddlewareDefinition<any, any, any, any, any, any, any>[] | undefined;
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

export type ExtractPreconditionsFromMiddleware<TMw> = TMw extends {
  readonly _requires?: infer R;
}
  ? [R] extends [MiddlewarePreconditions]
    ? R
    : {}
  : {};

export type ExtractLayoutIdFromMiddleware<TMw> = TMw extends {
  readonly _layoutId?: infer L;
}
  ? [L] extends [string]
    ? L
    : undefined
  : undefined;

export type IsBranchAllowedForLayout<
  TCurrentLayoutPath extends string,
  TTargetLayoutId extends string | undefined,
> = [TTargetLayoutId] extends [undefined]
  ? true
  : [TTargetLayoutId] extends [never]
    ? true
    : string extends TTargetLayoutId
      ? true
      : string extends TCurrentLayoutPath
        ? true
        : TTargetLayoutId extends TCurrentLayoutPath
          ? true
          : RouterRegister extends { LayoutHierarchy: infer LH }
            ? TCurrentLayoutPath extends keyof LH
              ? TTargetLayoutId extends GetParentLayoutIds<TCurrentLayoutPath>
                ? true
                : false
              : false
            : true;

export type IsBranchAllowedForRoute<
  TRoutePath extends string,
  TMethod extends HttpMethod,
  TTargetLayoutId extends string | undefined,
> = [TTargetLayoutId] extends [undefined]
  ? true
  : [TTargetLayoutId] extends [never]
    ? true
    : string extends TTargetLayoutId
      ? true
      : string extends TRoutePath
        ? true
        : RouterRegister extends { RouteByPathMethod: infer R }
          ? TRoutePath extends keyof R
            ? TMethod extends keyof R[TRoutePath]
              ? TTargetLayoutId extends GetRouteLayoutIds<TRoutePath, TMethod>
                ? true
                : false
              : false
            : false
          : true;

export type CheckFacetPrecondition<TAvailable, TRequired> = [TRequired] extends [never]
  ? true
  : [TRequired] extends [undefined]
    ? true
    : unknown extends TRequired
      ? true
      : [Exclude<TRequired, undefined>] extends [never]
        ? true
        : [TAvailable] extends [never]
          ? false
          : TAvailable extends Exclude<TRequired, undefined>
            ? true
            : false;

export type CheckMiddlewarePreconditions<
  TState,
  TServices,
  TParams,
  TQuery,
  TBody,
  TRequires extends MiddlewarePreconditions,
> = CheckFacetPrecondition<TState, TRequires["state"]> extends false
  ? false
  : CheckFacetPrecondition<TServices, TRequires["services"]> extends false
    ? false
    : CheckFacetPrecondition<TParams, TRequires["params"]> extends false
      ? false
      : CheckFacetPrecondition<TQuery, TRequires["query"]> extends false
        ? false
        : CheckFacetPrecondition<TBody, TRequires["body"]> extends false
          ? false
          : true;

export type CompileError<TMessage extends string> = {
  readonly __compile_error: TMessage;
} & never;

type NormalizeParams<T> = unknown extends T
  ? Record<string, string>
  : [T] extends [never]
    ? Record<string, string>
    : T;

type NormalizeQuery<T> = unknown extends T
  ? Record<string, string | string[]>
  : [T] extends [never]
    ? Record<string, string | string[]>
    : T;

export type ValidateRouteMiddlewareUse<
  TPath extends string,
  TMethod extends HttpMethod,
  TParams,
  TQuery,
  TBody,
  TRouteServices,
  TRouteState,
  TMw,
> = IsBranchAllowedForRoute<TPath, TMethod, ExtractLayoutIdFromMiddleware<TMw>> extends false
  ? CompileError<`Cannot mount layout-scoped middleware: route "${TPath}" is outside layout branch "${NonNullable<ExtractLayoutIdFromMiddleware<TMw>>}"`>
  : CheckMiddlewarePreconditions<
      InferRouteState<TPath, TMethod> & TRouteState,
      InferRouteServices<TPath, TMethod> & TRouteServices,
      NormalizeParams<TParams>,
      NormalizeQuery<TQuery>,
      TBody,
      ExtractPreconditionsFromMiddleware<TMw>
    > extends false
    ? CompileError<`Cannot mount middleware: route does not satisfy declared preconditions`>
    : TMw;

export type ValidateLayoutMiddlewareUse<
  TPath extends string,
  TParams,
  TQuery,
  TBody,
  TServices,
  TState,
  TMw,
> = IsBranchAllowedForLayout<TPath, ExtractLayoutIdFromMiddleware<TMw>> extends false
  ? CompileError<`Cannot mount layout-scoped middleware: layout "${TPath}" is outside layout branch "${NonNullable<ExtractLayoutIdFromMiddleware<TMw>>}"`>
  : CheckMiddlewarePreconditions<
      InferLayoutState<TPath> & TState,
      InferLayoutServices<TPath> & TServices,
      NormalizeParams<TParams>,
      NormalizeQuery<TQuery>,
      TBody,
      ExtractPreconditionsFromMiddleware<TMw>
    > extends false
    ? CompileError<`Cannot mount middleware: layout does not satisfy declared preconditions`>
    : TMw;

type ResolveMwParam<T, TReq> = unknown extends T
  ? [TReq] extends [undefined] ? Record<string, string> : NonNullable<TReq>
  : [T] extends [never]
    ? [TReq] extends [undefined] ? Record<string, string> : NonNullable<TReq>
    : T;

type ResolveMwQuery<T, TReq> = unknown extends T
  ? [TReq] extends [undefined] ? Record<string, string | string[]> : NonNullable<TReq>
  : [T] extends [never]
    ? [TReq] extends [undefined] ? Record<string, string | string[]> : NonNullable<TReq>
    : T;

type ResolveMwBody<T, TReq> = unknown extends T
  ? [TReq] extends [undefined] ? unknown : TReq
  : T;

export type InferMiddlewareArgs<
  TLayoutId extends string | undefined,
  TParams,
  TQuery,
  TBody,
  TRequires extends MiddlewarePreconditions,
> = MiddlewareArgs<
  InferLayoutBranchServices<TLayoutId> & (TRequires extends { services?: infer S } ? NonNullable<S> : {}),
  InferLayoutBranchState<TLayoutId> & (TRequires extends { state?: infer St } ? NonNullable<St> : {}),
  ResolveMwParam<TParams, TRequires["params"]>,
  ResolveMwQuery<TQuery, TRequires["query"]>,
  ResolveMwBody<TBody, TRequires["body"]>
>;

export interface ContextOptions<
  TBoot extends Record<string, unknown> = {},
  TRequest extends Record<string, unknown> = {},
> {
  boot?: (() => TBoot | Promise<TBoot>) | undefined;
  request?: ((req: TaserRequest<any, any, any>) => TRequest | Promise<TRequest>) | undefined;
}

export interface ContextDefinition<
  TBoot extends Record<string, unknown> = {},
  TRequest extends Record<string, unknown> = {},
> extends ContextOptions<TBoot, TRequest> {
  readonly kind: "context";
}

export type NotFoundHandler<TContext = {}> = (args: {
  req: TaserRequest<any, any, any>;
  ctx: TContext;
}) => Response | Promise<Response>;

export type OnErrorHandler = (err: unknown, req: TaserRequest<any, any, any>) => Response | Promise<Response>;

export interface ResponseOptions {
  validate?: boolean | undefined;
}

export type InferReturnsResponse<TReturns> = [TReturns] extends [undefined]
  ? Response
  : [TReturns] extends [never]
    ? Response
    : unknown extends TReturns
      ? Response
      : {
          [K in keyof TReturns & number]: TypedResponse<
            TReturns[K] extends StandardSchemaV1
              ? StandardSchemaV1.InferOutput<TReturns[K]>
              : unknown,
            K
          >;
        }[keyof TReturns & number];

export interface TaserAppOptions<TContext = {}> {
  basePath?: string | undefined;
  context?: ContextDefinition<any, any> | undefined;
  notFound?: NotFoundHandler<TContext> | undefined;
  onError?: OnErrorHandler | undefined;
  response?: ResponseOptions | undefined;
}

export interface TaserDefinition<TContext = {}> {
  readonly _context?: TContext;
  readonly $Infer: {
    Context: TContext;
  };
  readonly options: TaserAppOptions<TContext>;
}

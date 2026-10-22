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

export type StandardHttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "QUERY";

export type HttpMethod = StandardHttpMethod | "ALL" | "ANY";
export type HttpNoBodyMethod = "GET";

export type DefaultRouteBody<TMethod extends HttpMethod> = [TMethod] extends [HttpNoBodyMethod]
  ? never
  : {};

export type Simplify<T> = unknown extends T
  ? T
  : T extends ((...args: any[]) => any) | readonly any[]
    ? T
    : { [K in keyof T]: T[K] } & {};

type DefaultParams = Record<string, string>;
type DefaultQuery = Record<string, string | string[]>;

type FallbackIfEmpty<T, TFallback, TPresent = T> = unknown extends T
  ? TFallback
  : [T] extends [never]
    ? TFallback
    : TPresent;

type NormalizeFacet<T, TFallback = {}> = FallbackIfEmpty<T, TFallback, NonNullable<T>>;

type ParamToken<TSegment extends string> = TSegment extends `:${infer Token}` ? Token : never;

type ExtractParamTokens<TPath extends string> = TPath extends `${infer Segment}/${infer Rest}`
  ? ParamToken<Segment> | ExtractParamTokens<Rest>
  : ParamToken<TPath>;

export type HasWildcard<T extends string> = string extends T
  ? false
  : T extends `${string}*${string}`
    ? true
    : false;

type SplatParams<TPath extends string> = HasWildcard<TPath> extends true ? { _splat: string } : {};

export type SanitizeRouteParams<TPath extends string, TParams> =
  HasWildcard<TPath> extends true ? TParams : Omit<TParams, "_splat">;

type ParamsFromSegments<T extends string> = Simplify<
  {
    [Token in ExtractParamTokens<T> as Token extends `${string}?` ? never : Token]: string;
  } & {
    [Token in ExtractParamTokens<T> as Token extends `${infer Name}?` ? Name : never]?: string;
  }
>;

export type RouteDefaultParams<TPath extends string = string> = string extends TPath
  ? DefaultParams
  : Simplify<SplatParams<TPath> & ParamsFromSegments<TPath>>;

export interface TaserRequest<TParams = {}, TQuery = {}, TBody = unknown> {
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
  ? keyof LT & string
  : never;

export type InferredAppContext = RouterRegister extends { AppContext: infer C } ? C : {};

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

export type AllUnionKeys<T> = T extends any ? keyof T : never;

export type OptionalUnionKeys<U> = U extends any
  ? { [K in keyof U]-?: {} extends Pick<U, K> ? K : never }[keyof U]
  : never;

export type RequiredUnionKeys<U> = Exclude<keyof U, OptionalUnionKeys<U>>;

export type ExtractUnionKey<U, K extends PropertyKey> = U extends any
  ? K extends keyof U
    ? U[K]
    : never
  : never;

export type NormalizeUnion<U> = Simplify<
  {
    [K in RequiredUnionKeys<U>]: ExtractUnionKey<U, K>;
  } & {
    [K in Exclude<AllUnionKeys<U>, RequiredUnionKeys<U>>]?: ExtractUnionKey<U, K>;
  }
>;

export type MergeUnion<U> = unknown extends U
  ? {}
  : [U] extends [never]
    ? {}
    : [AllUnionKeys<U>, U] extends [keyof U, UnionToIntersection<U>]
      ? U
      : NormalizeUnion<U>;

export type IsAny<T> = 0 extends 1 & T ? true : false;

export type DistributeProp<T, K extends "_services" | "_state"> =
  IsAny<T> extends true
    ? {}
    : T extends { readonly _isMiddlewareResponse: true }
      ? T extends { readonly [P in K]?: (_: any) => infer Val }
        ? [Val] extends [never]
          ? {}
          : NonNullable<Val>
        : {}
      : never;

export type DistributeServices<T> = DistributeProp<T, "_services">;

export type DistributeState<T> = DistributeProp<T, "_state">;

export type InferPropFromMw<T, K extends "_services" | "_state"> = T extends (
  args: any,
  next: any,
) => infer R
  ? MergeUnion<DistributeProp<Awaited<R>, K>>
  : T extends { readonly [P in K]?: infer V }
    ? [V] extends [never]
      ? {}
      : MergeUnion<NonNullable<V>>
    : {};

export type InferServicesFromMw<T> = InferPropFromMw<T, "_services">;

export type InferStateFromMw<T> = InferPropFromMw<T, "_state">;

type FacetKey = "_services" | "_state" | "_params" | "_query" | "_body";

type FacetFallback<K extends FacetKey> = K extends "_body" ? unknown : {};

type ExtractFacetFromMiddleware<TMw, K extends FacetKey> = TMw extends {
  readonly [P in K]?: infer V;
}
  ? NormalizeFacet<V, FacetFallback<K>>
  : FacetFallback<K>;

type ExtractFacetFromLayout<TLayout, K extends FacetKey> = TLayout extends {
  readonly [P in K]?: infer V;
}
  ? NormalizeFacet<V>
  : TLayout extends { readonly middlewares: readonly (infer M)[] }
    ? ExtractFacetFromMiddleware<M, K>
    : {};

export type ExtractServicesFromMiddleware<TMw> = ExtractFacetFromMiddleware<TMw, "_services">;

export type ExtractStateFromMiddleware<TMw> = ExtractFacetFromMiddleware<TMw, "_state">;

export type ExtractParamsFromMiddleware<TMw> = ExtractFacetFromMiddleware<TMw, "_params">;

export type ExtractQueryFromMiddleware<TMw> = ExtractFacetFromMiddleware<TMw, "_query">;

export type ExtractBodyFromMiddleware<TMw> = ExtractFacetFromMiddleware<TMw, "_body">;

export type ExtractServicesFromLayout<TLayout> = ExtractFacetFromLayout<TLayout, "_services">;

export type ExtractStateFromLayout<TLayout> = ExtractFacetFromLayout<TLayout, "_state">;

export type ExtractParamsFromLayout<TLayout> = ExtractFacetFromLayout<TLayout, "_params">;

export type ExtractQueryFromLayout<TLayout> = ExtractFacetFromLayout<TLayout, "_query">;

export type ExtractBodyFromLayout<TLayout> = ExtractFacetFromLayout<TLayout, "_body">;

type GetRouteLayoutIds<TPath extends string, TMethod extends HttpMethod> = RouterRegister extends {
  RouteByPathMethod: infer R;
}
  ? TPath extends keyof R
    ? TMethod extends keyof R[TPath]
      ? R[TPath][TMethod] extends { layouts: infer L }
        ? L extends readonly (infer Id extends string)[]
          ? Id
          : never
        : never
      : never
    : never
  : never;

type GetLayoutFacet<LId extends string, K extends FacetKey> = [LId] extends [never]
  ? never
  : RouterRegister extends { LayoutTree: infer LT }
    ? LId extends keyof LT
      ? ExtractFacetFromLayout<LT[LId], K>
      : {}
    : {};

type InferRouteFacet<
  TPath extends string,
  TMethod extends HttpMethod,
  K extends FacetKey,
> = SafeIntersect<GetLayoutFacet<GetRouteLayoutIds<TPath, TMethod>, K>>;

export type InferRouteServices<TPath extends string, TMethod extends HttpMethod> = InferRouteFacet<
  TPath,
  TMethod,
  "_services"
>;

export type InferRouteState<TPath extends string, TMethod extends HttpMethod> = InferRouteFacet<
  TPath,
  TMethod,
  "_state"
>;

export type InferRouteParams<TPath extends string, TMethod extends HttpMethod> = Simplify<
  Omit<InferRouteFacet<TPath, TMethod, "_params">, "_splat">
>;

export type InferRouteQuery<TPath extends string, TMethod extends HttpMethod> = InferRouteFacet<
  TPath,
  TMethod,
  "_query"
>;

export type InferRouteBody<TPath extends string, TMethod extends HttpMethod> = InferRouteFacet<
  TPath,
  TMethod,
  "_body"
>;

type GetParentLayoutIds<LId extends string> = RouterRegister extends {
  LayoutHierarchy: infer LH;
}
  ? LId extends keyof LH
    ? LH[LId] extends readonly (infer Id extends string)[]
      ? Id
      : never
    : never
  : never;

type InferLayoutFacet<TPath extends string, K extends FacetKey> = SafeIntersect<
  GetLayoutFacet<GetParentLayoutIds<TPath>, K>
>;

export type InferLayoutState<TPath extends string> = InferLayoutFacet<TPath, "_state">;

export type InferLayoutServices<TPath extends string> = InferLayoutFacet<TPath, "_services">;

export type InferLayoutParams<TPath extends string> = Simplify<
  Omit<InferLayoutFacet<TPath, "_params">, "_splat">
>;

export type InferLayoutQuery<TPath extends string> = InferLayoutFacet<TPath, "_query">;

export type InferLayoutBody<TPath extends string> = InferLayoutFacet<TPath, "_body">;

export type InferLayoutEffectiveParams<TPath extends string, TParams> = [
  keyof InferLayoutParams<TPath>,
] extends [never]
  ? TParams
  : Overwrite<InferLayoutParams<TPath>, TParams>;

export type InferLayoutEffectiveQuery<TPath extends string, TQuery> = Overwrite<
  InferLayoutQuery<TPath>,
  TQuery
>;

export type InferLayoutEffectiveBody<TPath extends string, TBody> = Overwrite<
  InferLayoutBody<TPath>,
  TBody
>;

type InferLayoutBranchFacet<LId extends string | undefined, K extends FacetKey> = [LId] extends [
  undefined,
]
  ? {}
  : SafeIntersect<GetLayoutFacet<NonNullable<LId> | GetParentLayoutIds<NonNullable<LId>>, K>>;

export type InferLayoutBranchState<LId extends string | undefined> = InferLayoutBranchFacet<
  LId,
  "_state"
>;

export type InferLayoutBranchServices<LId extends string | undefined> = InferLayoutBranchFacet<
  LId,
  "_services"
>;

export type InferLayoutBranchParams<LId extends string | undefined> = Simplify<
  [LId] extends [undefined]
    ? { _splat: string }
    : RouteDefaultParams<NonNullable<LId>> &
        SafeIntersect<
          GetLayoutFacet<NonNullable<LId> | GetParentLayoutIds<NonNullable<LId>>, "_params">
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
  SplatParams<TPath> &
    Omit<
      [keyof InferRouteParams<TPath, TMethod>] extends [never]
        ? TRouteParams
        : [TRouteParams] extends [RouteDefaultParams<TPath>]
          ? Overwrite<RouteDefaultParams<TPath>, InferRouteParams<TPath, TMethod>>
          : Overwrite<InferRouteParams<TPath, TMethod>, TRouteParams>,
      "_splat"
    >
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
    req: Simplify<TaserRequest<TParams, TQuery, TBody>>;
    ctx: InferredAppContext;
    state: Simplify<MergeUnion<TState>>;
  } & TServices
>;

export interface MiddlewareResponse<TServices = {}, TState = {}> extends Omit<Response, "type"> {
  readonly type?: "middleware";
  readonly _isMiddlewareResponse: true;
  readonly _services?: (_: TServices) => TServices;
  readonly _state?: (_: TState) => TState;
}

export type ValidRouteHandlerReturn = Response | Promise<Response>;

export type ValidMiddlewareReturn =
  | Response
  | MiddlewareResponse<any, any>
  | Promise<Response | MiddlewareResponse<any, any>>;

export type RouteHandler<
  TParams = {},
  TQuery = {},
  TBody = unknown,
  TServices = {},
  TState = {},
  TReturn extends ValidRouteHandlerReturn = ValidRouteHandlerReturn,
> = (args: RouteHandlerArgs<TParams, TQuery, TBody, TServices, TState>) => TReturn;

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
    req: Simplify<TaserRequest<TParams & { _splat: string }, TQuery, TBody>>;
    ctx: InferredAppContext;
    state: Simplify<MergeUnion<TState>>;
  } & TServices
>;

export type MiddlewareHandler<
  TServices = Record<string, any>,
  TState = Record<string, unknown>,
  TParams = DefaultParams,
  TQuery = DefaultQuery,
  TBody = unknown,
> = (
  args: MiddlewareArgs<TServices, TState, TParams, TQuery, TBody>,
  next: NextFunction,
) => ValidMiddlewareReturn;

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

export type MiddlewareInput =
  | MiddlewareHandler
  | MiddlewareDefinition<any, any, any, any, any, any, any>;

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
  readonly middlewares?:
    | readonly MiddlewareDefinition<any, any, any, any, any, any, any>[]
    | undefined;
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

export type CheckFacetPrecondition<TAvailable, TRequired> = [TRequired] extends [undefined]
  ? true
  : unknown extends TRequired
    ? true
    : [TAvailable] extends [never]
      ? false
      : TAvailable extends Exclude<TRequired, undefined>
        ? true
        : false;

type IsDefinitelyFalse<T> = [T] extends [false] ? true : false;

export type CheckMiddlewarePreconditions<
  TState,
  TServices,
  TParams,
  TQuery,
  TBody,
  TRequires extends MiddlewarePreconditions,
> = true extends
  | IsDefinitelyFalse<CheckFacetPrecondition<TState, TRequires["state"]>>
  | IsDefinitelyFalse<CheckFacetPrecondition<TServices, TRequires["services"]>>
  | IsDefinitelyFalse<CheckFacetPrecondition<TParams, TRequires["params"]>>
  | IsDefinitelyFalse<CheckFacetPrecondition<TQuery, TRequires["query"]>>
  | IsDefinitelyFalse<CheckFacetPrecondition<TBody, TRequires["body"]>>
  ? false
  : true;

export type CompileError<TMessage extends string> = {
  readonly __compile_error: TMessage;
} & never;

type NormalizeParams<T> = FallbackIfEmpty<T, DefaultParams>;

type NormalizeQuery<T> = FallbackIfEmpty<T, DefaultQuery>;

export type CheckMiddlewareReturn<TMw> = TMw extends (...args: any[]) => infer R
  ? [Awaited<R>] extends [Response | MiddlewareResponse<any, any>]
    ? true
    : false
  : true;

export type ValidateMiddlewareFn<F> =
  CheckMiddlewareReturn<F> extends false
    ? CompileError<`Middleware must return a valid Response, next(), or next.provide()`>
    : F;

export type ValidateRouteMiddlewareUse<
  TPath extends string,
  TMethod extends HttpMethod,
  TParams,
  TQuery,
  TBody,
  TRouteServices,
  TRouteState,
  TMw,
> = [ValidateMiddlewareFn<TMw>] extends [never]
  ? ValidateMiddlewareFn<TMw>
  : IsBranchAllowedForRoute<TPath, TMethod, ExtractLayoutIdFromMiddleware<TMw>> extends false
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
> = [ValidateMiddlewareFn<TMw>] extends [never]
  ? ValidateMiddlewareFn<TMw>
  : IsBranchAllowedForLayout<TPath, ExtractLayoutIdFromMiddleware<TMw>> extends false
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

type RequiredOrDefault<TReq, TDefault> = [TReq] extends [undefined] ? TDefault : NonNullable<TReq>;

type ResolveMwParam<T, TReq, TLayoutId extends string | undefined = undefined> = FallbackIfEmpty<
  T,
  RequiredOrDefault<
    TReq,
    [TLayoutId] extends [undefined] ? DefaultParams : InferLayoutBranchParams<TLayoutId>
  >
>;

type ResolveMwQuery<T, TReq> = FallbackIfEmpty<T, RequiredOrDefault<TReq, DefaultQuery>>;

type ResolveMwBody<T, TReq> = FallbackIfEmpty<T, [TReq] extends [undefined] ? unknown : TReq>;

export type InferMiddlewareArgs<
  TLayoutId extends string | undefined,
  TParams,
  TQuery,
  TBody,
  TRequires extends MiddlewarePreconditions,
> = MiddlewareArgs<
  InferLayoutBranchServices<TLayoutId> &
    (TRequires extends { services?: infer S } ? NonNullable<S> : {}),
  InferLayoutBranchState<TLayoutId> &
    (TRequires extends { state?: infer St } ? NonNullable<St> : {}),
  ResolveMwParam<TParams, TRequires["params"], TLayoutId>,
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

export type OnErrorHandler = (
  err: unknown,
  req: TaserRequest<any, any, any>,
) => Response | Promise<Response>;

export interface ResponseOptions {
  validate?: boolean | undefined;
}

export type InferReturnsResponse<TReturns> = [TReturns] extends [undefined]
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

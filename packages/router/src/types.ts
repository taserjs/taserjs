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

export type ExtractServicesFromMiddleware<TMw> = TMw extends { readonly _services?: infer S }
  ? S
  : TMw extends MiddlewareDefinition<infer S, any, any>
    ? S
    : {};

export type ExtractStateFromMiddleware<TMw> = TMw extends { readonly _state?: infer St }
  ? St
  : TMw extends MiddlewareDefinition<any, infer St, any>
    ? St
    : {};

export type ExtractServicesFromLayout<TLayout> = TLayout extends { readonly _services?: infer S }
  ? S
  : TLayout extends LayoutDefinition<any, infer S, any>
    ? S
    : TLayout extends { readonly middlewares: readonly (infer M)[] }
      ? ExtractServicesFromMiddleware<M>
      : {};

export type ExtractStateFromLayout<TLayout> = TLayout extends { readonly _state?: infer St }
  ? St
  : TLayout extends LayoutDefinition<any, any, infer St>
    ? St
    : TLayout extends { readonly middlewares: readonly (infer M)[] }
      ? ExtractStateFromMiddleware<M>
      : {};

type GetRouteLayoutIds<TPath extends string, TMethod extends HttpMethod> = RouterRegister extends {
  RouteByPathMethod: infer R;
}
  ? TPath extends keyof R
    ? TMethod extends keyof R[TPath]
      ? R[TPath][TMethod] extends { layouts: infer L }
        ? L extends readonly (infer Id)[]
          ? Id
          : L extends (infer Id)[]
            ? Id
            : never
        : never
      : never
    : never
  : never;

type GetLayoutServices<LId extends string> = RouterRegister extends { LayoutTree: infer LT }
  ? LId extends keyof LT
    ? ExtractServicesFromLayout<LT[LId]>
    : RouterRegister extends { LayoutMiddlewares: infer LM }
      ? LId extends keyof LM
        ? LM[LId] extends readonly (infer M)[]
          ? ExtractServicesFromMiddleware<M>
          : {}
        : {}
      : {}
  : RouterRegister extends { LayoutMiddlewares: infer LM }
    ? LId extends keyof LM
      ? LM[LId] extends readonly (infer M)[]
        ? ExtractServicesFromMiddleware<M>
        : {}
      : {}
    : {};

type GetLayoutState<LId extends string> = RouterRegister extends { LayoutTree: infer LT }
  ? LId extends keyof LT
    ? ExtractStateFromLayout<LT[LId]>
    : RouterRegister extends { LayoutMiddlewares: infer LM }
      ? LId extends keyof LM
        ? LM[LId] extends readonly (infer M)[]
          ? ExtractStateFromMiddleware<M>
          : {}
        : {}
      : {}
  : RouterRegister extends { LayoutMiddlewares: infer LM }
    ? LId extends keyof LM
      ? LM[LId] extends readonly (infer M)[]
        ? ExtractStateFromMiddleware<M>
        : {}
      : {}
    : {};

export type InferRouteServices<TPath extends string, TMethod extends HttpMethod> = SafeIntersect<
  GetLayoutServices<GetRouteLayoutIds<TPath, TMethod>>
>;

export type InferRouteState<TPath extends string, TMethod extends HttpMethod> = SafeIntersect<
  GetLayoutState<GetRouteLayoutIds<TPath, TMethod>>
>;

export type RouteHandlerArgs<
  TParams = Record<string, string>,
  TQuery = Record<string, string | string[]>,
  TBody = unknown,
  TServices = {},
  TState = Record<string, unknown>,
> = {
  req: TaserRequest<TParams, TQuery, TBody>;
  ctx: InferredAppContext;
  state: [keyof TState] extends [never] ? Record<string, unknown> : TState;
} & TServices;

export type RouteHandler<
  TParams = Record<string, string>,
  TQuery = Record<string, string | string[]>,
  TBody = unknown,
  TServices = {},
  TState = Record<string, unknown>,
> = (
  args: RouteHandlerArgs<TParams, TQuery, TBody, TServices, TState>,
) => Response | Promise<Response>;

export interface NextFunction {
  (state?: Record<string, unknown> | undefined): Promise<Response>;
  provide(
    services: Record<string, unknown>,
    state?: Record<string, unknown> | undefined,
  ): Promise<Response>;
}

export type MiddlewareArgs<TServices = Record<string, any>, TParams = Record<string, string>> = {
  req: TaserRequest<TParams>;
  ctx: InferredAppContext;
  state: Record<string, unknown>;
} & TServices;

export type MiddlewareHandler<TServices = Record<string, any>, TParams = Record<string, string>> = (
  args: MiddlewareArgs<TServices, TParams>,
  next: NextFunction,
) => Response | Promise<Response>;

export interface MiddlewareDefinition<
  TServices = {},
  TState = {},
  TParams = Record<string, string>,
> {
  readonly kind: "middleware";
  readonly handler: MiddlewareHandler<any, any>;
  readonly schemas?: RouteSchemas | undefined;
  readonly _services?: TServices;
  readonly _state?: TState;
  readonly _params?: TParams;
}

export type MiddlewareInput = MiddlewareHandler | MiddlewareDefinition<any, any, any>;

export interface LayoutDefinition<TPath extends string = string, TServices = {}, TState = {}> {
  readonly kind: "layout";
  readonly path: TPath;
  readonly middlewares: readonly MiddlewareDefinition<any, any>[];
  readonly _services?: TServices;
  readonly _state?: TState;
}

export interface RouteDefinition<TPath extends string = string> {
  readonly kind: "route";
  readonly method: HttpMethod;
  readonly path: TPath;
  readonly middlewares?: readonly MiddlewareDefinition<any, any>[] | undefined;
  readonly handler: RouteHandler<any, any, any, any, any>;
  readonly schemas?: RouteSchemas | undefined;
  readonly returns?: Record<StatusCode, StandardSchemaV1> | undefined;
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

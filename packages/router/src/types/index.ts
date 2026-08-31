import type { Awaitable, TaserCookieJar, TaserHeaders } from "@taserjs/router-core";
import type {
  RouterMiddlewaresRegister,
  RouterRegister,
  RouterRoutesRegister,
} from "../index.js";
import type {
  MergeMiddlewareField,
  MergeMiddlewareInputField,
  MergePart,
  RequestShape,
  Simplify,
  UnionToIntersection,
  UnitRuntimeContext,
} from "./type-utils.js";
import type { ReturnsMap, ValidHandlerReply } from "./returns.js";
import type { Schema } from "./schema.js";
import type {
  EmptyAppContext,
  ExtractState,
  Method,
  MiddlewareDefinition,
  MiddlewareRequirements,
  MiddlewareReturnFromParts,
  MiddlewareUnit,
  NextFn,
  ValidatorParts,
} from "./units.js";

export type { Awaitable } from "@taserjs/router-core";
export type {
  SchemaRequestShape,
  InferInput,
  InferOutput,
  Schema,
  StandardSchemaV1,
} from "./schema.js";
export type {
  MergeMiddlewareField,
  MergeMiddlewareInputField,
  MergePart,
  RequestShape,
  Simplify,
  UnitRuntimeContext,
  UnwrapPart,
} from "./type-utils.js";
export type {
  EmptyReturns,
  EnforceHandlerReply,
  HandlerReply,
  HasReturns,
  MergeReturns,
  ReplyFor,
  ReturnsMap,
  StatusCode,
  ValidHandlerReply,
} from "./returns.js";
export type {
  EmptyAppContext,
  ExtractState,
  HttpMethod,
  IsUnknown,
  Method,
  MiddlewareDefinition,
  MiddlewareRequirements,
  MiddlewareReturnFromParts,
  MiddlewareUnit,
  MiddlewareUnitBuilder,
  NextFn,
  NextResult,
  StandaloneMiddlewareContext,
  StateBrand,
  ValidatorParts,
} from "./units.js";

export type AppContext = RouterRegister extends { AppContext: infer C } ? C : EmptyAppContext;

export type RoutePath = RouterRegister extends { RoutePath: infer P } ? P : never;
export type LayoutId = RouterRegister extends { LayoutId: infer L } ? L : never;
export type LayoutTree = RouterRegister extends { LayoutTree: infer T } ? T : Record<never, never>;
export type LayoutMiddlewaresMap = RouterMiddlewaresRegister extends {
  LayoutMiddlewares: infer M;
}
  ? M
  : RouterRegister extends { LayoutMiddlewares: infer M }
    ? M
    : Record<never, never>;
export type RouteByPathMethod = RouterRoutesRegister extends { RouteByPathMethod: infer R }
  ? R
  : RouterRegister extends { RouteByPathMethod: infer R }
    ? R
    : Record<never, never>;

export type LayoutBuilder<TAppContext extends Record<string, unknown> = AppContext> = <
  const Layout extends LayoutId,
>(
  layout: Layout,
) => MiddlewareBuilder<Layout, readonly [], TAppContext>;

type ParseParam<Segment extends string> = Segment extends "*"
  ? { _splat: string }
  : Segment extends `:${infer Name extends string}`
    ? Name extends ""
      ? {}
      : { [K in Name]: string }
    : {};

type ParseParamsFromSegments<S extends string> = S extends `${infer Segment}/${infer Rest}`
  ? ParseParam<Segment> & ParseParamsFromSegments<Rest>
  : ParseParam<S>;

export type PathParams<Path extends string> = Path extends `/${infer Rest}`
  ? ParseParamsFromSegments<Rest>
  : {};

export type ResolveParams<TPathParams, TSchemaParams> =
  TSchemaParams extends Record<string, unknown>
    ? [keyof TSchemaParams] extends [never]
      ? TPathParams
      : Simplify<Omit<TPathParams, keyof TSchemaParams> & TSchemaParams>
    : TPathParams;

type LayoutParent<Layout extends LayoutId> = Layout extends keyof LayoutTree
  ? LayoutTree[Layout] extends { parent: infer P extends LayoutId }
    ? P
    : null
  : null;

type LayoutMiddlewares<Layout extends LayoutId> = [Layout] extends [keyof LayoutMiddlewaresMap]
  ? LayoutMiddlewaresMap[Layout] extends { readonly __acc?: infer Acc extends readonly unknown[] }
    ? Acc
    : LayoutMiddlewaresMap[Layout] extends readonly unknown[]
      ? LayoutMiddlewaresMap[Layout]
      : readonly []
  : readonly [];

type ResolveLayoutMiddlewares<
  Layout extends LayoutId | null,
  Depth extends readonly unknown[] = [],
> = Depth["length"] extends 10
  ? readonly []
  : [Layout] extends [LayoutId]
    ? LayoutParent<Layout> extends infer Parent extends LayoutId
      ? readonly [
          ...ResolveLayoutMiddlewares<Parent, [...Depth, unknown]>,
          ...LayoutMiddlewares<Layout>,
        ]
      : readonly [...LayoutMiddlewares<Layout>]
    : readonly [];

export type ResolveLayoutIdChain<
  L extends LayoutId | null,
  Depth extends readonly unknown[] = [],
> = Depth["length"] extends 10
  ? readonly []
  : L extends LayoutId
    ? readonly [...ResolveLayoutIdChain<LayoutParent<L>, [...Depth, unknown]>, L]
    : readonly [];

export type ResolveLayoutMiddlewaresState<Layout extends LayoutId | null> = Layout extends LayoutId
  ? MergeMiddlewareField<ResolveLayoutMiddlewares<Layout>, "state">
  : {};

export type ResolveLayoutsState<Layouts extends LayoutId | readonly LayoutId[]> =
  Layouts extends LayoutId
    ? ResolveLayoutMiddlewaresState<Layouts>
    : Layouts extends readonly LayoutId[]
      ? UnionToIntersection<
          Layouts[number] extends infer L extends LayoutId
            ? ResolveLayoutMiddlewaresState<L>
            : never
        >
      : {};

/** Fold layout middleware Acc from a route's layoutChain (shallow → deep). */
type ResolveLayoutChainMiddlewares<Chain extends readonly LayoutId[]> = Chain extends readonly [
  infer Head extends LayoutId,
  ...infer Rest,
]
  ? readonly [
      ...LayoutMiddlewares<Head>,
      ...ResolveLayoutChainMiddlewares<Rest extends readonly LayoutId[] ? Rest : readonly []>,
    ]
  : readonly [];

type RouteEntry<Path extends RoutePath, TMethod extends Method> = RouteByPathMethod[Path] extends {
  [K in TMethod]: infer Entry;
}
  ? Entry
  : never;

type RouteLayoutChain<Path extends RoutePath, TMethod extends Method> =
  RouteEntry<Path, TMethod> extends { layouts: infer Chain extends readonly LayoutId[] }
    ? Chain
    : readonly [];

export type RouteLayoutMiddlewares<
  Path extends RoutePath,
  TMethod extends Method,
> = ResolveLayoutChainMiddlewares<RouteLayoutChain<Path, TMethod>>;

export type RouteLayoutField<
  Path extends RoutePath,
  TMethod extends Method,
  Field extends "query" | "params" | "body" | "state",
> = MergeMiddlewareField<RouteLayoutMiddlewares<Path, TMethod>, Field>;

export type RouteLayoutInputField<
  Path extends RoutePath,
  TMethod extends Method,
  Field extends "query" | "params" | "body",
> = MergeMiddlewareInputField<RouteLayoutMiddlewares<Path, TMethod>, Field>;

type RouteResolvedField<
  Path extends RoutePath,
  TMethod extends Method,
  Acc extends readonly unknown[],
  Field extends "query" | "params" | "body" | "state",
> = RouteLayoutField<Path, TMethod, Field> & MergeMiddlewareField<Acc, Field>;

export type RouteChainContext<
  Path extends RoutePath,
  TMethod extends Method,
  Acc extends readonly unknown[],
  TQuery,
  TParams,
  TBody,
  TAppContext extends Record<string, unknown> = AppContext,
> = Simplify<
  TAppContext &
    UnitRuntimeContext & {
      query: MergePart<TQuery, RouteResolvedField<Path, TMethod, Acc, "query">>;
      params: ResolveParams<
        PathParams<Path>,
        MergePart<TParams, RouteResolvedField<Path, TMethod, Acc, "params">>
      >;
      body: MergePart<TBody, RouteResolvedField<Path, TMethod, Acc, "body">>;
      state: RouteResolvedField<Path, TMethod, Acc, "state">;
      headers: TaserHeaders;
      cookies: TaserCookieJar;
    }
>;

export type RouteHandleContext<
  Path extends RoutePath,
  TMethod extends Method,
  Acc extends readonly unknown[],
  Validators extends {
    query?: unknown;
    params?: unknown;
    body?: unknown;
  },
  TAppContext extends Record<string, unknown> = AppContext,
> = Simplify<
  TAppContext &
    UnitRuntimeContext & {
      path: Path;
      method: TMethod;
      query: Simplify<
        MergePart<
          Validators extends { query?: infer Q } ? Q : unknown,
          RouteResolvedField<Path, TMethod, Acc, "query">
        >
      >;
      params: Simplify<
        ResolveParams<
          PathParams<Path>,
          MergePart<
            Validators extends { params?: infer P } ? P : unknown,
            RouteResolvedField<Path, TMethod, Acc, "params">
          >
        >
      >;
      body: Simplify<
        MergePart<
          Validators extends { body?: infer B } ? B : unknown,
          RouteResolvedField<Path, TMethod, Acc, "body">
        >
      >;
      state: Simplify<RouteResolvedField<Path, TMethod, Acc, "state">>;
      headers: TaserHeaders;
      cookies: TaserCookieJar;
    }
>;

export type RouteHandleContextWithoutBody<
  Path extends RoutePath,
  TMethod extends Method,
  Acc extends readonly unknown[],
  Validators extends {
    query?: unknown;
    params?: unknown;
  },
  TAppContext extends Record<string, unknown> = AppContext,
> = Simplify<
  TAppContext &
    UnitRuntimeContext & {
      path: Path;
      method: TMethod;
      query: Simplify<
        MergePart<
          Validators extends { query?: infer Q } ? Q : unknown,
          RouteResolvedField<Path, TMethod, Acc, "query">
        >
      >;
      params: Simplify<
        ResolveParams<
          PathParams<Path>,
          MergePart<
            Validators extends { params?: infer P } ? P : unknown,
            RouteResolvedField<Path, TMethod, Acc, "params">
          >
        >
      >;
      body: never;
      state: Simplify<RouteResolvedField<Path, TMethod, Acc, "state">>;
      headers: TaserHeaders;
      cookies: TaserCookieJar;
    }
>;

type RouteResolvedInputField<
  Path extends RoutePath,
  TMethod extends Method,
  Acc extends readonly unknown[],
  Field extends "query" | "params" | "body",
> = RouteLayoutInputField<Path, TMethod, Field> & MergeMiddlewareInputField<Acc, Field>;

type IsNever<T> = [T] extends [never] ? true : false;

type IsEmptyObject<T> = [keyof T] extends [never] ? true : false;

export type IsLayoutAllowed<TRequiredLayouts, TChain extends readonly LayoutId[]> = [
  TRequiredLayouts,
] extends [never]
  ? true
  : [unknown] extends [TRequiredLayouts]
    ? true
    : [null] extends [TRequiredLayouts]
      ? true
      : [undefined] extends [TRequiredLayouts]
        ? true
        : TRequiredLayouts extends LayoutId
          ? TRequiredLayouts extends TChain[number]
            ? true
            : false
          : TRequiredLayouts extends readonly LayoutId[]
            ? [TRequiredLayouts[number] & TChain[number]] extends [never]
              ? false
              : true
            : true;

export type IsRequirementsSatisfied<
  TActual extends {
    query?: unknown;
    params?: unknown;
    body?: unknown;
    state?: unknown;
  },
  TRequires extends MiddlewareRequirements,
> = [TRequires] extends [never]
  ? true
  : [unknown] extends [TRequires]
    ? true
    : [null] extends [TRequires]
      ? true
      : [undefined] extends [TRequires]
        ? true
        : [IsEmptyObject<TRequires>] extends [true]
          ? true
          : (
                TRequires extends { state: infer S extends Record<string, unknown> }
                  ? [TActual["state"]] extends [S]
                    ? true
                    : false
                  : true
              ) extends false
            ? false
            : (
                  TRequires extends { query: infer Q extends Record<string, unknown> }
                    ? [TActual["query"]] extends [Q]
                      ? true
                      : false
                    : true
                ) extends false
              ? false
              : (
                    TRequires extends { params: infer P extends Record<string, unknown> }
                      ? [TActual["params"]] extends [P]
                        ? true
                        : false
                      : true
                  ) extends false
                ? false
                : (
                      TRequires extends { body: infer B }
                        ? unknown extends B
                          ? true
                          : [TRequires["body"]] extends [undefined]
                            ? true
                            : [TActual["body"]] extends [B]
                              ? true
                              : false
                        : true
                    ) extends false
                  ? false
                  : true;

export type IsStateSatisfied<TActualState, TRequiredState> = IsRequirementsSatisfied<
  { state: TActualState },
  { state: TRequiredState extends Record<string, unknown> ? TRequiredState : {} }
>;

type InputFacet<T, K extends string> =
  IsNever<T> extends true ? {} : IsEmptyObject<T> extends true ? {} : { [Key in K]: T };

type RouteQueryInput<
  Path extends RoutePath,
  TMethod extends Method,
  Acc extends readonly unknown[],
  Validators extends ValidatorParts,
> = Simplify<
  MergePart<
    RequestShape<
      Validators extends { queryIn?: infer QI } ? QI : unknown,
      Validators extends { query?: infer Q } ? Q : unknown
    >,
    RouteResolvedInputField<Path, TMethod, Acc, "query">
  >
>;

type RouteParamsInput<
  Path extends RoutePath,
  TMethod extends Method,
  Acc extends readonly unknown[],
  Validators extends ValidatorParts,
> = Simplify<
  ResolveParams<
    PathParams<Path>,
    MergePart<
      RequestShape<
        Validators extends { paramsIn?: infer PI } ? PI : unknown,
        Validators extends { params?: infer P } ? P : unknown
      >,
      RouteResolvedInputField<Path, TMethod, Acc, "params">
    >
  >
>;

type RouteBodyInput<
  Path extends RoutePath,
  TMethod extends Method,
  Acc extends readonly unknown[],
  Validators extends ValidatorParts,
> = Simplify<
  MergePart<
    RequestShape<
      Validators extends { bodyIn?: infer BI } ? BI : unknown,
      Validators extends { body?: infer B } ? B : unknown
    >,
    RouteResolvedInputField<Path, TMethod, Acc, "body">
  >
>;

export type RouteHandleInputWithoutBody<
  Path extends RoutePath,
  TMethod extends Method,
  Acc extends readonly unknown[],
  Validators extends ValidatorParts = {},
> = Simplify<
  InputFacet<RouteQueryInput<Path, TMethod, Acc, Validators>, "query"> &
    InputFacet<RouteParamsInput<Path, TMethod, Acc, Validators>, "params">
>;

export type RouteHandleInput<
  Path extends RoutePath,
  TMethod extends Method,
  Acc extends readonly unknown[],
  Validators extends ValidatorParts = {},
> = Simplify<
  RouteHandleInputWithoutBody<Path, TMethod, Acc, Validators> &
    InputFacet<RouteBodyInput<Path, TMethod, Acc, Validators>, "body">
>;

export type InferRouteInputFromPath<Path extends RoutePath, TMethod extends Method> =
  RouteEntry<Path, TMethod> extends { route: infer Route }
    ? Route extends { $Infer: { Input: infer I } }
      ? I
      : never
    : never;

export type MiddlewareLayoutField<
  Layout extends LayoutId,
  Field extends "query" | "params" | "body" | "state",
> = [LayoutParent<Layout>] extends [infer Parent extends LayoutId]
  ? MergeMiddlewareField<ResolveLayoutMiddlewares<Parent>, Field>
  : {};

type MiddlewareChainField<
  Layout extends LayoutId,
  Acc extends readonly unknown[],
  Field extends "query" | "params" | "body" | "state",
> = MiddlewareLayoutField<Layout, Field> & MergeMiddlewareField<Acc, Field>;

export type MiddlewareChainContext<
  Layout extends LayoutId,
  Acc extends readonly unknown[],
  TQuery = unknown,
  TParams = unknown,
  TBody = unknown,
  TAppContext extends Record<string, unknown> = AppContext,
> = Simplify<
  TAppContext & {
    readonly request: Request;
    readonly method: Method;
    readonly url: URL;
    readonly headers: TaserHeaders;
    readonly cookies: TaserCookieJar;
    query: Simplify<MergePart<TQuery, MiddlewareChainField<Layout, Acc, "query">>>;
    params: Simplify<MergePart<TParams, MiddlewareChainField<Layout, Acc, "params">>>;
    body: Simplify<MergePart<TBody, MiddlewareChainField<Layout, Acc, "body">>>;
    state: Simplify<MiddlewareChainField<Layout, Acc, "state">>;
  }
>;

export type MiddlewareBuilder<
  Layout extends LayoutId,
  Acc extends readonly unknown[] = readonly [],
  TAppContext extends Record<string, unknown> = AppContext,
> = {
  readonly layout: Layout;
  readonly middlewares: readonly MiddlewareDefinition[];
  readonly __acc?: Acc;
  use<
    TAcc,
    TReturns extends ReturnsMap = {},
    TRequiredLayouts = unknown,
    TRequires extends MiddlewareRequirements = {},
  >(
    unit: [
      IsLayoutAllowed<TRequiredLayouts, ResolveLayoutIdChain<Layout>>,
      IsRequirementsSatisfied<
        {
          query: MiddlewareChainField<Layout, Acc, "query">;
          params: MiddlewareChainField<Layout, Acc, "params">;
          body: MiddlewareChainField<Layout, Acc, "body">;
          state: MiddlewareChainField<Layout, Acc, "state">;
        },
        TRequires
      >,
    ] extends [true, true]
      ? MiddlewareUnit<TAcc, TReturns, TRequiredLayouts, TRequires>
      : never,
  ): MiddlewareBuilder<Layout, readonly [...Acc, TAcc], TAppContext>;
  use<R = unknown>(
    fn: (
      ctx: Simplify<
        TAppContext & {
          readonly request: Request;
          readonly method: Method;
          readonly url: URL;
          readonly headers: TaserHeaders;
          readonly cookies: TaserCookieJar;
          query: Simplify<MergePart<unknown, MiddlewareChainField<Layout, Acc, "query">>>;
          params: Simplify<MergePart<unknown, MiddlewareChainField<Layout, Acc, "params">>>;
          body: Simplify<MergePart<unknown, MiddlewareChainField<Layout, Acc, "body">>>;
          state: Simplify<MiddlewareChainField<Layout, Acc, "state">>;
        }
      >,
      next: NextFn,
    ) => Awaitable<R>,
  ): MiddlewareBuilder<
    Layout,
    readonly [...Acc, MiddlewareReturnFromParts<unknown, unknown, unknown, ExtractState<R>>],
    TAppContext
  >;
};

export type RouteExport<
  Path extends RoutePath,
  TMethod extends Method,
  Acc extends readonly unknown[],
  TReturns extends ReturnsMap = {},
  TOutput = Response,
> = {
  readonly path: Path;
  readonly method: TMethod | "ANY" | "ALL";
  readonly methods?: readonly Method[];
  readonly middlewares: readonly MiddlewareDefinition[];
  readonly __acc?: Acc;
  readonly returns?: TReturns;
  readonly bodyMode?: "json" | "form" | "urlencoded";
  handler: (ctx: unknown) => Awaitable<Response>;
  readonly $Infer: {
    Context: TMethod extends "GET" | "DELETE" | "HEAD" | "OPTIONS"
      ? RouteHandleContextWithoutBody<Path, TMethod, Acc, {}>
      : RouteHandleContext<Path, TMethod, Acc, {}>;
    Input: TMethod extends "GET" | "DELETE" | "HEAD" | "OPTIONS"
      ? RouteHandleInputWithoutBody<Path, TMethod, Acc, {}>
      : RouteHandleInput<Path, TMethod, Acc, {}>;
    Output: TOutput;
  };
  query?: Schema<unknown>;
  params?: Schema<unknown>;
  body?: Schema<unknown>;
};

type RouteHandleResult<
  Path extends RoutePath,
  TMethod extends Method,
  Acc extends readonly unknown[],
  Validators extends ValidatorParts,
  TReturns extends ReturnsMap = {},
  TOutput = Response,
  TAppContext extends Record<string, unknown> = AppContext,
> = Omit<RouteExport<Path, TMethod, Acc, TReturns, TOutput>, "$Infer"> & {
  readonly $Infer: {
    Context: TMethod extends "GET" | "DELETE" | "HEAD" | "OPTIONS"
      ? RouteHandleContextWithoutBody<Path, TMethod, Acc, Validators, TAppContext>
      : RouteHandleContext<Path, TMethod, Acc, Validators, TAppContext>;
    Input: TMethod extends "GET" | "DELETE" | "HEAD" | "OPTIONS"
      ? RouteHandleInputWithoutBody<Path, TMethod, Acc, Validators>
      : RouteHandleInput<Path, TMethod, Acc, Validators>;
    Output: TOutput;
  };
};

export type RouteContractBuilderBase<
  Path extends RoutePath,
  TMethod extends Method,
  Acc extends readonly unknown[] = readonly [],
  Validators extends ValidatorParts = {},
  TReturns extends ReturnsMap = {},
  TAppContext extends Record<string, unknown> = AppContext,
> = {
  readonly path: Path;
  readonly method: TMethod;
  readonly $Infer: {
    Context: TMethod extends "GET" | "DELETE" | "HEAD" | "OPTIONS"
      ? RouteHandleContextWithoutBody<Path, TMethod, Acc, Validators, TAppContext>
      : RouteHandleContext<Path, TMethod, Acc, Validators, TAppContext>;
    Input: TMethod extends "GET" | "DELETE" | "HEAD" | "OPTIONS"
      ? RouteHandleInputWithoutBody<Path, TMethod, Acc, Validators>
      : RouteHandleInput<Path, TMethod, Acc, Validators>;
    Output: TReturns;
  };
  query<TQuery, TQueryIn = unknown>(
    schema: Schema<TQuery, TQueryIn>,
  ): RouteContractBuilder<
    Path,
    TMethod,
    Acc,
    Omit<Validators, "query" | "queryIn"> & { query: TQuery; queryIn: TQueryIn },
    TReturns,
    TAppContext
  >;
  params<TParams, TParamsIn = unknown>(
    schema: Schema<TParams, TParamsIn>,
  ): RouteContractBuilder<
    Path,
    TMethod,
    Acc,
    Omit<Validators, "params" | "paramsIn"> & { params: TParams; paramsIn: TParamsIn },
    TReturns,
    TAppContext
  >;
  returns<const M extends ReturnsMap>(
    map: M,
  ): RouteContractBuilder<Path, TMethod, Acc, Validators, Omit<TReturns, keyof M> & M, TAppContext>;
  handler<R extends Response = Response>(
    fn: (
      ctx: TMethod extends "GET" | "DELETE" | "HEAD" | "OPTIONS"
        ? RouteHandleContextWithoutBody<Path, TMethod, Acc, Validators, TAppContext>
        : RouteHandleContext<Path, TMethod, Acc, Validators, TAppContext>,
    ) => Awaitable<R>,
    ..._assert: [R] extends [ValidHandlerReply<R, TReturns>]
      ? []
      : [
          {
            expected: ValidHandlerReply<R, TReturns>;
            actual: R;
          },
        ]
  ): RouteHandleResult<Path, TMethod, Acc, Validators, TReturns, R, TAppContext>;
};

export type RouteContractBuilder<
  Path extends RoutePath,
  TMethod extends Method,
  Acc extends readonly unknown[] = readonly [],
  Validators extends ValidatorParts = {},
  TReturns extends ReturnsMap = {},
  TAppContext extends Record<string, unknown> = AppContext,
> = RouteContractBuilderBase<Path, TMethod, Acc, Validators, TReturns, TAppContext> &
  (TMethod extends "GET" | "DELETE" | "HEAD" | "OPTIONS"
    ? {}
    : {
        body<TBody, TBodyIn = unknown>(
          schema: Schema<TBody, TBodyIn>,
        ): RouteContractBuilder<
          Path,
          TMethod,
          Acc,
          Omit<Validators, "body" | "bodyIn"> & { body: TBody; bodyIn: TBodyIn },
          TReturns,
          TAppContext
        >;
        body<Mode extends "json" | "form" | "urlencoded", TBody, TBodyIn = unknown>(
          mode: Mode,
          schema: Schema<TBody, TBodyIn>,
        ): RouteContractBuilder<
          Path,
          TMethod,
          Acc,
          Omit<Validators, "body" | "bodyIn"> & { body: TBody; bodyIn: TBodyIn },
          TReturns,
          TAppContext
        >;
      });

export type RouteMiddlewareBuilder<
  Path extends RoutePath,
  TMethod extends Method,
  Acc extends readonly unknown[] = readonly [],
  Validators extends ValidatorParts = {},
  TReturns extends ReturnsMap = {},
  TAppContext extends Record<string, unknown> = AppContext,
> = RouteContractBuilder<Path, TMethod, Acc, Validators, TReturns, TAppContext> & {
  use<
    TAcc,
    UReturns extends ReturnsMap = {},
    TRequiredLayouts = unknown,
    TRequires extends MiddlewareRequirements = {},
  >(
    unit: [
      IsLayoutAllowed<TRequiredLayouts, RouteLayoutChain<Path, TMethod>>,
      IsRequirementsSatisfied<
        {
          query: RouteResolvedField<Path, TMethod, Acc, "query">;
          params: ResolveParams<PathParams<Path>, RouteResolvedField<Path, TMethod, Acc, "params">>;
          body: RouteResolvedField<Path, TMethod, Acc, "body">;
          state: RouteResolvedField<Path, TMethod, Acc, "state">;
        },
        TRequires
      >,
    ] extends [true, true]
      ? MiddlewareUnit<TAcc, UReturns, TRequiredLayouts, TRequires>
      : never,
  ): RouteMiddlewareBuilder<
    Path,
    TMethod,
    readonly [...Acc, TAcc],
    Validators,
    Omit<TReturns, keyof UReturns> & UReturns,
    TAppContext
  >;
  use<R = unknown>(
    fn: (
      ctx: RouteChainContext<Path, TMethod, Acc, unknown, unknown, unknown, TAppContext>,
      next: NextFn,
    ) => Awaitable<R>,
  ): RouteMiddlewareBuilder<
    Path,
    TMethod,
    readonly [...Acc, MiddlewareReturnFromParts<unknown, unknown, unknown, ExtractState<R>>],
    Validators,
    TReturns,
    TAppContext
  >;
};

export type RouteBuilder<
  Path extends RoutePath,
  TMethod extends Method,
  Acc extends readonly unknown[] = readonly [],
  Validators extends ValidatorParts = {},
  TReturns extends ReturnsMap = {},
  TAppContext extends Record<string, unknown> = AppContext,
> = RouteMiddlewareBuilder<Path, TMethod, Acc, Validators, TReturns, TAppContext>;

export type RouteDefinition<
  Path extends RoutePath = RoutePath,
  TMethod extends Method = Method,
  Acc extends readonly unknown[] = readonly unknown[],
  Validators extends ValidatorParts = ValidatorParts,
  TReturns extends ReturnsMap = ReturnsMap,
  TOutput = Response,
  TAppContext extends Record<string, unknown> = AppContext,
> = RouteHandleResult<Path, TMethod, Acc, Validators, TReturns, TOutput, TAppContext>;

export type InferRouteContext<R> = R extends { $Infer: { Context: infer C } } ? C : never;
export type InferRouteInput<R> = R extends { $Infer: { Input: infer I } } ? I : never;
export type InferRouteOutput<R> = R extends { $Infer: { Output: infer O } } ? O : never;

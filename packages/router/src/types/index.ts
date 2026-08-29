import type { Awaitable, TaserCookieJar, TaserHeaders } from "@taserjs/router-core";
import type { RouterRegister } from "../register.js";
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
  AppContext,
  ExtractState,
  HandlerContext,
  HandlerUnit,
  InlineMiddlewareOptions,
  Method,
  MiddlewareDefinition,
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
export type { RouterRegister } from "../register.js";
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
  AppContext,
  ExtractState,
  HandlerContext,
  HandlerUnit,
  HttpMethod,
  InlineMiddlewareOptions,
  IsUnknown,
  Method,
  MiddlewareDefinition,
  MiddlewareNext,
  MiddlewareReturnFromParts,
  MiddlewareUnit,
  NextFn,
  NextResult,
  StandaloneMiddlewareContext,
  StateBrand,
  ValidatorParts,
} from "./units.js";

export type RoutePath = RouterRegister extends { RoutePath: infer P } ? P : never;
export type LayoutId = RouterRegister extends { LayoutId: infer L } ? L : never;
export type LayoutTree = RouterRegister extends { LayoutTree: infer T } ? T : Record<never, never>;
export type RouteByPathMethod = RouterRegister extends { RouteByPathMethod: infer R }
  ? R
  : Record<never, never>;

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

type LayoutParent<Layout extends LayoutId> = LayoutTree[Layout] extends {
  parent: infer Parent extends LayoutId | null;
}
  ? Parent
  : null;

type ResolveLayoutMiddlewares<Layout extends LayoutId | null> = Layout extends null
  ? readonly []
  : Layout extends LayoutId
    ? readonly [
        ...ResolveLayoutMiddlewares<LayoutParent<Layout>>,
        ...LayoutTree[Layout]["middlewares"],
      ]
    : readonly [];

export type ResolveLayoutIdChain<L extends LayoutId | null> = L extends null
  ? readonly []
  : L extends LayoutId
    ? readonly [...ResolveLayoutIdChain<LayoutParent<L>>, L]
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
      ...LayoutTree[Head]["middlewares"],
      ...ResolveLayoutChainMiddlewares<Rest extends readonly LayoutId[] ? Rest : readonly []>,
    ]
  : readonly [];

type RouteEntry<Path extends RoutePath, TMethod extends Method> = RouteByPathMethod[Path] extends {
  [K in TMethod]: infer Entry;
}
  ? Entry
  : never;

type RouteParent<Path extends RoutePath, TMethod extends Method> =
  RouteEntry<Path, TMethod> extends { parent: infer Parent extends LayoutId | null }
    ? Parent
    : null;

type RouteLayoutChain<Path extends RoutePath, TMethod extends Method> =
  RouteEntry<Path, TMethod> extends { layoutChain: infer Chain extends readonly LayoutId[] }
    ? Chain
    : RouteParent<Path, TMethod> extends LayoutId
      ? readonly [RouteParent<Path, TMethod>]
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

type RouteChainField<
  Path extends RoutePath,
  TMethod extends Method,
  Acc extends readonly unknown[],
  Field extends "query" | "params" | "body" | "state",
> = RouteResolvedField<Path, TMethod, Acc, Field>;

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
      query: Simplify<MergePart<TQuery, RouteChainField<Path, TMethod, Acc, "query">>>;
      params: Simplify<
        ResolveParams<
          PathParams<Path>,
          MergePart<TParams, RouteChainField<Path, TMethod, Acc, "params">>
        >
      >;
      body: Simplify<MergePart<TBody, RouteChainField<Path, TMethod, Acc, "body">>>;
      state: Simplify<RouteChainField<Path, TMethod, Acc, "state">>;
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

export type IsStateSatisfied<TActualState, TRequiredState> = [TRequiredState] extends [never]
  ? true
  : [unknown] extends [TRequiredState]
    ? true
    : [null] extends [TRequiredState]
      ? true
      : [undefined] extends [TRequiredState]
        ? true
        : [IsEmptyObject<TRequiredState>] extends [true]
          ? true
          : [TActualState] extends [TRequiredState]
            ? true
            : false;

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
> = MergeMiddlewareField<ResolveLayoutMiddlewares<LayoutParent<Layout>>, Field>;

type MiddlewareChainField<
  Layout extends LayoutId,
  Acc extends readonly unknown[],
  Field extends "query" | "params" | "body" | "state",
> = MiddlewareLayoutField<Layout, Field> & MergeMiddlewareField<Acc, Field>;

export type MiddlewareChainContext<
  Layout extends LayoutId,
  Acc extends readonly unknown[],
  TQuery,
  TParams,
  TBody,
  TAppContext extends Record<string, unknown> = AppContext,
> = Simplify<
  TAppContext &
    UnitRuntimeContext & {
      query: Simplify<MergePart<TQuery, MiddlewareChainField<Layout, Acc, "query">>>;
      params: Simplify<MergePart<TParams, MiddlewareChainField<Layout, Acc, "params">>>;
      body: Simplify<MergePart<TBody, MiddlewareChainField<Layout, Acc, "body">>>;
      state: Simplify<MiddlewareChainField<Layout, Acc, "state">>;
      headers: TaserHeaders;
      cookies: TaserCookieJar;
    }
>;

export type MiddlewareBuilder<
  Layout extends LayoutId,
  Acc extends readonly unknown[] = readonly [],
  TAppContext extends Record<string, unknown> = AppContext,
> = Acc & {
  readonly layout: Layout;
  readonly middlewares: readonly MiddlewareDefinition[];
  readonly $Infer: {
    Context: MiddlewareChainContext<Layout, Acc, unknown, unknown, unknown, TAppContext>;
  };
  use<TAcc, TReturns extends ReturnsMap = {}, TRequiredLayouts = unknown, TRequiredState = unknown>(
    unit: MiddlewareUnit<TAcc, TReturns, TRequiredLayouts, TRequiredState>,
    ..._assert: [
      IsLayoutAllowed<TRequiredLayouts, ResolveLayoutIdChain<Layout>>,
      IsStateSatisfied<MiddlewareChainField<Layout, Acc, "state">, TRequiredState>,
    ] extends [true, true]
      ? []
      : [
          {
            error: "Middleware cannot be attached to this layout";
            requiredLayouts: TRequiredLayouts;
            layoutChain: ResolveLayoutIdChain<Layout>;
            requiredState: TRequiredState;
            actualState: MiddlewareChainField<Layout, Acc, "state">;
          },
        ]
  ): MiddlewareBuilder<Layout, readonly [...Acc, TAcc], TAppContext>;
  use<R = unknown>(
    fn: (
      ctx: MiddlewareChainContext<Layout, Acc, unknown, unknown, unknown, TAppContext>,
      next: NextFn,
    ) => Awaitable<R>,
  ): MiddlewareBuilder<
    Layout,
    readonly [...Acc, MiddlewareReturnFromParts<unknown, unknown, unknown, ExtractState<R>>],
    TAppContext
  >;
  use<
    TQuery = unknown,
    TParams = unknown,
    TBody = unknown,
    TReturns extends ReturnsMap = {},
    TQueryIn = unknown,
    TParamsIn = unknown,
    TBodyIn = unknown,
    R = unknown,
  >(
    options: InlineMiddlewareOptions<
      MiddlewareChainContext<Layout, Acc, TQuery, TParams, TBody, TAppContext>,
      TQuery,
      TParams,
      TBody,
      TReturns,
      TQueryIn,
      TParamsIn,
      TBodyIn,
      R
    >,
  ): MiddlewareBuilder<
    Layout,
    readonly [
      ...Acc,
      MiddlewareReturnFromParts<
        TQuery,
        TParams,
        TBody,
        ExtractState<R>,
        TQueryIn,
        TParamsIn,
        TBodyIn
      >,
    ],
    TAppContext
  >;
};

export type RouteExport<
  Path extends RoutePath,
  TMethod extends Method,
  Acc extends readonly unknown[],
  TReturns extends ReturnsMap = {},
  TOutput = Response,
> = Acc & {
  readonly path: Path;
  readonly method: TMethod | "ANY" | "ALL";
  readonly methods?: readonly Method[];
  readonly middlewares: readonly MiddlewareDefinition[];
  readonly handlerMiddlewares: readonly MiddlewareDefinition[];
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
  handlerQuery?: Schema<unknown>;
  handlerParams?: Schema<unknown>;
  handlerBody?: Schema<unknown>;
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

export type RouteBuilderBase<
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
  ): RouteBuilder<
    Path,
    TMethod,
    Acc,
    Omit<Validators, "query" | "queryIn"> & { query: TQuery; queryIn: TQueryIn },
    TReturns,
    TAppContext
  >;
  params<TParams, TParamsIn = unknown>(
    schema: Schema<TParams, TParamsIn>,
  ): RouteBuilder<
    Path,
    TMethod,
    Acc,
    Omit<Validators, "params" | "paramsIn"> & { params: TParams; paramsIn: TParamsIn },
    TReturns,
    TAppContext
  >;
  returns<const M extends ReturnsMap>(
    map: M,
  ): RouteBuilder<Path, TMethod, Acc, Validators, Omit<TReturns, keyof M> & M, TAppContext>;
  use<TAcc, UReturns extends ReturnsMap = {}, TRequiredLayouts = unknown, TRequiredState = unknown>(
    unit: MiddlewareUnit<TAcc, UReturns, TRequiredLayouts, TRequiredState>,
    ..._assert: [
      IsLayoutAllowed<TRequiredLayouts, RouteLayoutChain<Path, TMethod>>,
      IsStateSatisfied<RouteResolvedField<Path, TMethod, Acc, "state">, TRequiredState>,
    ] extends [true, true]
      ? []
      : [
          {
            error: "Middleware cannot be attached to this route";
            requiredLayouts: TRequiredLayouts;
            routeLayoutChain: RouteLayoutChain<Path, TMethod>;
            requiredState: TRequiredState;
            actualState: RouteResolvedField<Path, TMethod, Acc, "state">;
          },
        ]
  ): RouteBuilder<
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
  ): RouteBuilder<
    Path,
    TMethod,
    readonly [...Acc, MiddlewareReturnFromParts<unknown, unknown, unknown, ExtractState<R>>],
    Validators,
    TReturns,
    TAppContext
  >;
  use<
    TQuery = unknown,
    TParams = unknown,
    TBody = unknown,
    UReturns extends ReturnsMap = {},
    TQueryIn = unknown,
    TParamsIn = unknown,
    TBodyIn = unknown,
    R = unknown,
  >(
    options: InlineMiddlewareOptions<
      RouteChainContext<Path, TMethod, Acc, TQuery, TParams, TBody, TAppContext>,
      TQuery,
      TParams,
      TBody,
      UReturns,
      TQueryIn,
      TParamsIn,
      TBodyIn,
      R
    >,
  ): RouteBuilder<
    Path,
    TMethod,
    readonly [
      ...Acc,
      MiddlewareReturnFromParts<
        TQuery,
        TParams,
        TBody,
        ExtractState<R>,
        TQueryIn,
        TParamsIn,
        TBodyIn
      >,
    ],
    Validators,
    Omit<TReturns, keyof UReturns> & UReturns,
    TAppContext
  >;
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
  handler<
    HandlerAcc extends readonly unknown[] = readonly [],
    HandlerValidators extends ValidatorParts = ValidatorParts,
    HReturns extends ReturnsMap = {},
    HOutput = Response,
  >(
    unit: HandlerUnit<HandlerAcc, HandlerValidators, HReturns, HOutput>,
  ): RouteHandleResult<
    Path,
    TMethod,
    readonly [...Acc, ...HandlerAcc],
    Validators,
    Omit<TReturns, keyof HReturns> & HReturns,
    HOutput,
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
> = RouteBuilderBase<Path, TMethod, Acc, Validators, TReturns, TAppContext> &
  (TMethod extends "GET" | "DELETE" | "HEAD" | "OPTIONS"
    ? {}
    : {
        body<TBody, TBodyIn = unknown>(
          schema: Schema<TBody, TBodyIn>,
        ): RouteBuilder<
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
        ): RouteBuilder<
          Path,
          TMethod,
          Acc,
          Omit<Validators, "body" | "bodyIn"> & { body: TBody; bodyIn: TBodyIn },
          TReturns,
          TAppContext
        >;
      });

export type HandlerBuilder<
  Acc extends readonly unknown[] = readonly [],
  Validators extends ValidatorParts = {},
  TReturns extends ReturnsMap = {},
  TAppContext extends Record<string, unknown> = AppContext,
> = {
  returns<const M extends ReturnsMap>(
    map: M,
  ): HandlerBuilder<Acc, Validators, Omit<TReturns, keyof M> & M, TAppContext>;
  use<TAcc, UReturns extends ReturnsMap = {}, TRequiredLayouts = unknown, TRequiredState = unknown>(
    unit: MiddlewareUnit<TAcc, UReturns, TRequiredLayouts, TRequiredState>,
    ..._assert: [IsStateSatisfied<MergeMiddlewareField<Acc, "state">, TRequiredState>] extends [
      true,
    ]
      ? []
      : [
          {
            error: "Middleware cannot be attached to this handler";
            requiredState: TRequiredState;
            actualState: MergeMiddlewareField<Acc, "state">;
          },
        ]
  ): HandlerBuilder<
    readonly [...Acc, TAcc],
    Validators,
    Omit<TReturns, keyof UReturns> & UReturns,
    TAppContext
  >;
  use<R = unknown>(
    fn: (
      ctx: HandlerContext<Acc, { query: unknown; params: unknown; body: unknown }, TAppContext>,
      next: NextFn,
    ) => Awaitable<R>,
  ): HandlerBuilder<
    readonly [...Acc, MiddlewareReturnFromParts<unknown, unknown, unknown, ExtractState<R>>],
    Validators,
    TReturns,
    TAppContext
  >;
  use<
    TQuery = unknown,
    TParams = unknown,
    TBody = unknown,
    UReturns extends ReturnsMap = {},
    TQueryIn = unknown,
    TParamsIn = unknown,
    TBodyIn = unknown,
    R = unknown,
  >(
    options: InlineMiddlewareOptions<
      HandlerContext<Acc, { query: TQuery; params: TParams; body: TBody }, TAppContext>,
      TQuery,
      TParams,
      TBody,
      UReturns,
      TQueryIn,
      TParamsIn,
      TBodyIn,
      R
    >,
  ): HandlerBuilder<
    readonly [
      ...Acc,
      MiddlewareReturnFromParts<
        TQuery,
        TParams,
        TBody,
        ExtractState<R>,
        TQueryIn,
        TParamsIn,
        TBodyIn
      >,
    ],
    Validators,
    Omit<TReturns, keyof UReturns> & UReturns,
    TAppContext
  >;
  handler<R extends Response = Response>(
    fn: (ctx: HandlerContext<Acc, Validators, TAppContext>) => Awaitable<R>,
    ..._assert: [R] extends [ValidHandlerReply<R, TReturns>]
      ? []
      : [
          {
            expected: ValidHandlerReply<R, TReturns>;
            actual: R;
          },
        ]
  ): HandlerUnit<Acc, Validators, TReturns, R>;
};

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

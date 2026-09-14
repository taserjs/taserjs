import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { FormBody, FormBodyField, FormBodyInput } from "./form-body.js";
import type { HttpMethodName } from "./constants.js";
import type { HeaderValue } from "./url.js";

export type { FormBody, FormBodyField, FormBodyInput, HttpMethodName, HeaderValue };

export type Simplify<T> = { [K in keyof T]: T[K] } & {};

export type SuccessStatusCode = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226;

export type InferSchemaInput<T> = T extends StandardSchemaV1
  ? StandardSchemaV1.InferInput<T>
  : T extends { readonly "~standard": { readonly types?: infer Types } }
    ? NonNullable<Types> extends { readonly input: infer I }
      ? I
      : unknown
    : unknown;

export type InferSchemaOutput<T> = T extends StandardSchemaV1
  ? StandardSchemaV1.InferOutput<T>
  : T extends { readonly "~standard": { readonly types?: infer Types } }
    ? NonNullable<Types> extends { readonly output: infer O }
      ? O
      : unknown
    : unknown;

export type ClientRequestOptions = {
  headers?: HeaderValue;
  fetch?: typeof fetch;
  init?: RequestInit;
  onRequest?: (req: Request) => Request | Response | Promise<Request | Response | void> | void;
  onResponse?: (res: Response, req: Request) => Response | Promise<Response | void> | void;
};

export type CreateClientOptions = {
  baseUrl?: string;
  headers?: HeaderValue;
  fetch?: typeof fetch;
  onRequest?: (req: Request) => Request | Response | Promise<Request | Response | void> | void;
  onResponse?: (res: Response, req: Request) => Response | Promise<Response | void> | void;
};

export type ClientResponse<TJson = unknown> = Omit<Response, "json"> & {
  json(): Promise<TJson>;
};

type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

type HasRequiredKeys<T> = [RequiredKeys<T>] extends [never] ? false : true;

type ExtractReturnsSuccess<TReturns> =
  TReturns extends Record<number, any>
    ? {
        [K in keyof TReturns & SuccessStatusCode]: InferSchemaOutput<TReturns[K]>;
      }[keyof TReturns & SuccessStatusCode]
    : never;

type ExtractSingleHandlerData<T> = T extends {
  readonly _data?: infer D;
  readonly _status?: infer S;
}
  ? S extends SuccessStatusCode
    ? D
    : never
  : T extends { readonly data: infer D; readonly status: SuccessStatusCode }
    ? D
    : T extends { readonly _data?: infer D }
      ? D
      : T extends { json(): Promise<infer D> }
        ? [D] extends [never]
          ? unknown
          : [unknown] extends [D]
            ? unknown
            : D
        : unknown;

type ExtractHandlerData<TReturn> =
  Awaited<TReturn> extends infer T
    ? [T] extends [never]
      ? unknown
      : [ExtractSingleHandlerData<T>] extends [never]
        ? unknown
        : ExtractSingleHandlerData<T>
    : unknown;

type RouteReturns<Route> = Route extends { readonly $Infer?: { readonly Returns?: infer R } }
  ? R
  : Route extends { readonly returns?: infer R }
    ? R
    : never;

type RouteHandlerReturn<Route> = Route extends {
  readonly $Infer?: { readonly HandlerReturn?: infer HR };
}
  ? HR
  : Route extends { readonly handler?: (...args: any[]) => infer R }
    ? R
    : unknown;

export type InferredJsonOutput<Route> = [ExtractReturnsSuccess<RouteReturns<Route>>] extends [never]
  ? ExtractHandlerData<RouteHandlerReturn<Route>>
  : ExtractReturnsSuccess<RouteReturns<Route>>;

type RouteParamsIn<Route> = Route extends {
  readonly $Infer?: { readonly ParamsIn?: infer P };
}
  ? P
  : Route extends { readonly $Infer?: { readonly Params?: infer P } }
    ? P
    : Route extends { readonly $Infer?: { readonly Input?: { readonly params?: infer P } } }
      ? P
      : Record<string, string>;

type RouteQueryIn<Route> = Route extends {
  readonly $Infer?: { readonly QueryIn?: infer Q };
}
  ? Q
  : Route extends { readonly $Infer?: { readonly Query?: infer Q } }
    ? Q
    : Route extends { readonly $Infer?: { readonly Input?: { readonly query?: infer Q } } }
      ? Q
      : Record<string, unknown>;

type RouteBodyIn<Route> = Route extends {
  readonly $Infer?: { readonly BodyIn?: infer B };
}
  ? B
  : Route extends { readonly $Infer?: { readonly Body?: infer B } }
    ? B
    : Route extends { readonly $Infer?: { readonly Input?: { readonly body?: infer B } } }
      ? B
      : unknown;

type ParamArg<Route> =
  RouteParamsIn<Route> extends infer P
    ? HasRequiredKeys<P> extends true
      ? { param: P }
      : { param?: P }
    : {};

type QueryArg<Route> =
  RouteQueryIn<Route> extends infer Q
    ? [Q] extends [Record<string, unknown>]
      ? HasRequiredKeys<Q> extends true
        ? { query: Q }
        : { query?: Q }
      : { query?: Record<string, unknown> }
    : { query?: Record<string, unknown> };

type BodyArg<Route, Method> = Method extends "GET" | "HEAD" | "OPTIONS"
  ? {}
  : RouteBodyIn<Route> extends infer B
    ? [unknown] extends [B]
      ? { body?: unknown }
      : [keyof B] extends [never]
        ? { body?: unknown }
        : B extends Record<string, FormBodyField>
          ? { body: FormBodyInput<B> }
          : HasRequiredKeys<B> extends true
            ? { body: B }
            : { body?: B }
    : { body?: unknown };

export type ClientArgsFor<Entry, Method> = Entry extends { readonly route: infer Route }
  ? Simplify<ParamArg<Route> & QueryArg<Route> & BodyArg<Route, Method> & { headers?: HeaderValue }>
  : Entry extends { route: infer Route }
    ? Simplify<
        ParamArg<Route> & QueryArg<Route> & BodyArg<Route, Method> & { headers?: HeaderValue }
      >
    : {
        param?: Record<string, unknown>;
        query?: Record<string, unknown>;
        body?: unknown;
        headers?: HeaderValue;
      };

export type ClientMethodReturn<Entry> = Promise<
  ClientResponse<
    Entry extends { readonly route: infer Route }
      ? InferredJsonOutput<Route>
      : Entry extends { route: infer Route }
        ? InferredJsonOutput<Route>
        : unknown
  >
>;

export type ClientMethodFn<Entry, Method> =
  HasRequiredKeys<ClientArgsFor<Entry, Method>> extends true
    ? (
        args: ClientArgsFor<Entry, Method>,
        options?: ClientRequestOptions,
      ) => ClientMethodReturn<Entry>
    : (
        args?: ClientArgsFor<Entry, Method>,
        options?: ClientRequestOptions,
      ) => ClientMethodReturn<Entry>;

type MethodToClientKey = {
  GET: "$get";
  POST: "$post";
  PUT: "$put";
  PATCH: "$patch";
  DELETE: "$delete";
  OPTIONS: "$options";
  HEAD: "$head";
  QUERY: "$query";
};

export type ClientMethods<Methods> = {
  [M in keyof Methods & HttpMethodName as MethodToClientKey[M]]: ClientMethodFn<Methods[M], M>;
};

type ReplaceHyphens<S extends string> = S extends `${infer A}-${infer B}`
  ? `${A}_${ReplaceHyphens<B>}`
  : S;

type SegmentKey<Segment extends string> = Segment extends `:${infer Name}`
  ? `_${Name}` | `:${Name}`
  : Segment extends "*"
    ? "_splat" | "*"
    : Segment extends `.${infer DotName}`
      ? `$${ReplaceHyphens<DotName>}` | Segment
      : ReplaceHyphens<Segment> | Segment;

type PathToChain<
  Path extends string,
  Methods,
  Remaining extends string = Path extends `/${infer R}` ? R : Path,
> = Remaining extends ""
  ? ClientMethods<Methods>
  : Remaining extends `${infer Segment}/${infer Rest}`
    ? Segment extends ""
      ? PathToChain<Path, Methods, Rest>
      : { [K in SegmentKey<Segment>]: PathToChain<Path, Methods, Rest> }
    : {
        [K in SegmentKey<Remaining>]: ClientMethods<Methods>;
      };

type UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (
  value: infer I,
) => void
  ? I
  : never;

export type InferRoutes<TApp> = TApp extends { readonly routes: infer R }
  ? R extends { readonly routes: infer NestedR }
    ? NestedR
    : R extends { routes: infer NestedR }
      ? NestedR
      : R
  : TApp extends { routes: infer R }
    ? R extends { readonly routes: infer NestedR }
      ? NestedR
      : R extends { routes: infer NestedR }
        ? NestedR
        : R
    : TApp extends { readonly routeManifest: { readonly routes: infer R } }
      ? R
      : TApp extends { routeManifest: { routes: infer R } }
        ? R
        : TApp extends Record<string, any>
          ? TApp
          : never;

type ClientFromRoutes<Routes extends Record<string, any>> = UnionToIntersection<
  | {
      [Path in keyof Routes & string]: PathToChain<Path, Routes[Path]>;
    }[keyof Routes & string]
  | {
      [Path in keyof Routes & string]: Path extends "/"
        ? ClientMethods<Routes[Path]>
        : ClientMethods<Routes[Path]>;
    }
  | ("/" extends keyof Routes ? ClientMethods<Routes["/"]> : {})
>;

export type Client<TApp = never> = [TApp] extends [never]
  ? Record<string, any>
  : InferRoutes<TApp> extends infer Routes
    ? [Routes] extends [never]
      ? Record<string, any>
      : Routes extends Record<string, any>
        ? ClientFromRoutes<Routes>
        : Record<string, any>
    : Record<string, any>;

export type InferRequestType<T> = T extends (
  args: infer R,
  options?: ClientRequestOptions,
) => Promise<ClientResponse<any>>
  ? R
  : T extends (args?: infer R, options?: ClientRequestOptions) => Promise<ClientResponse<any>>
    ? R
    : never;

export type InferResponseType<T> = T extends (...args: any[]) => Promise<ClientResponse<infer O>>
  ? O
  : T extends (...args: any[]) => Promise<Response>
    ? unknown
    : never;

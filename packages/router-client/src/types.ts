import type { FormBody, FormBodyField, FormBodyInput } from "./form-body.js";
import type { HttpMethodName } from "./constants/methods.js";

export type { HttpMethodName };

export type Simplify<T> = { [K in keyof T]: T[K] } & {};

export type RouteManifestShape = {
  layouts?: Record<string, unknown>;
  routes: Record<string, Record<string, unknown>>;
};

export type ReturnsMap = Record<number, unknown>;

export type Schema<T = unknown> =
  | { readonly "~standard": unknown }
  | { parse(data: unknown): T }
  | { _output: T };

export type InferOutput<T> = T extends {
  readonly "~standard": { readonly types?: infer Types };
}
  ? NonNullable<Types> extends { readonly output?: infer O }
    ? O
    : T extends { _output: infer O }
      ? O
      : T extends { parse(data: unknown): infer O }
        ? O
        : unknown
  : T extends { _output: infer O }
    ? O
    : T extends { parse(data: unknown): infer O }
      ? O
      : unknown;

export type SuccessReplyData<R> =
  R extends { readonly status: infer S; readonly data: infer B }
    ? S extends 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226
      ? B
      : never
    : never;

export type InferAppManifest<TApp> =
  TApp extends { __manifest?: infer TManifest }
    ? TManifest
    : TApp extends { manifest: infer TManifest }
      ? TManifest
      : TApp extends RouteManifestShape
        ? TApp
        : never;

declare module "@taserjs/router" {
  interface RouterRegister {}
}

export type OpenQuery = Record<string, string | number | boolean | string[]>;

/** Schema-defined query fields plus any additional open query keys. */
export type QueryWithOpen<T> = Simplify<T & OpenQuery>;

export type ClientRequestOptions = {
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
  fetch?: typeof fetch;
  init?: RequestInit;
};

export type CreateClientOptions = {
  baseUrl: string;
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
  fetch?: typeof fetch;
};

type RequiredKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

type HasRequiredKeys<T> = [RequiredKeys<T>] extends [never] ? false : true;

type RouteInput<Route> = Route extends { $Infer: { Input: infer I } } ? I : {};

type QueryArg<T> =
  HasRequiredKeys<T> extends true ? { query: QueryWithOpen<T> } : { query?: QueryWithOpen<T> };

type RequiredParam<T> = HasRequiredKeys<T> extends true ? { param: T } : {};

type BodyArg<T> = T extends FormData
  ? { body: FormData | FormBody<Record<string, FormBodyField>> }
  : T extends Record<string, FormBodyField>
    ? { body: FormBodyInput<T> }
    : { body: T };

type InputToClientArgs<I> = Simplify<
  (I extends { query: infer Q } ? QueryArg<Q> : { query?: OpenQuery }) &
    (I extends { params: infer P } ? RequiredParam<P> : {}) &
    (I extends { body: infer B } ? BodyArg<B> : {})
>;

type ClientArgsFor<Entry> = Entry extends { route: infer Route }
  ? InputToClientArgs<RouteInput<Route>>
  : {};

type ClientMethodReturn<Entry> = Promise<
  ClientResponse<Entry extends { route: infer Route } ? OkJsonOutput<Route> : unknown>
>;

type InferredSuccessJson<Route> = Route extends { $Infer: { Output: infer O } }
  ? [SuccessReplyData<O>] extends [never]
    ? unknown
    : SuccessReplyData<O>
  : unknown;

/** Prefer `returns[200]` schema; else union of success `ReplyOf` bodies from `$Infer.Output`. */
type OkJsonOutput<Route> = Route extends { returns?: infer R }
  ? R extends ReturnsMap
    ? 200 extends keyof R
      ? R[200] extends Schema<unknown>
        ? InferOutput<R[200]>
        : InferredSuccessJson<Route>
      : InferredSuccessJson<Route>
    : InferredSuccessJson<Route>
  : InferredSuccessJson<Route>;

export type ClientResponse<TJson = unknown> = Omit<Response, "json"> & {
  json(): Promise<TJson>;
};

type MethodToClientKey = {
  GET: "$get";
  POST: "$post";
  PUT: "$put";
  PATCH: "$patch";
  DELETE: "$delete";
  OPTIONS: "$options";
  HEAD: "$head";
};

export type ClientMethodFn<Entry> =
  HasRequiredKeys<ClientArgsFor<Entry>> extends true
    ? (args: ClientArgsFor<Entry>, options?: ClientRequestOptions) => ClientMethodReturn<Entry>
    : (args?: ClientArgsFor<Entry>, options?: ClientRequestOptions) => ClientMethodReturn<Entry>;

type ClientMethods<Methods> = {
  [M in keyof Methods & HttpMethodName as MethodToClientKey[M]]: ClientMethodFn<Methods[M]>;
};

type ReplaceHyphens<S extends string> = S extends `${infer A}-${infer B}`
  ? `${A}_${ReplaceHyphens<B>}`
  : S;

type SegmentKey<Segment extends string> = Segment extends `:${infer Name}`
  ? `_${Name}`
  : Segment extends "*"
    ? "_splat"
    : Segment extends `.${infer DotName}`
      ? `$${ReplaceHyphens<DotName>}`
      : ReplaceHyphens<Segment>;

type PathToChain<
  Path extends string,
  Methods,
  Remaining extends string = Path extends `/${infer R}` ? R : Path,
> = Remaining extends ""
  ? ClientMethods<Methods>
  : Remaining extends `${infer Segment}/${infer Rest}`
    ? { [K in SegmentKey<Segment>]: PathToChain<Path, Methods, Rest> }
    : {
        [K in SegmentKey<Remaining>]: ClientMethods<Methods>;
      };

type UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (
  value: infer I,
) => void
  ? I
  : never;

type ClientFromRoutes<Manifest extends RouteManifestShape> = Manifest extends {
  routes: infer Routes;
}
  ? UnionToIntersection<
      {
        [Path in keyof Routes & string]: PathToChain<Path, Routes[Path]>;
      }[keyof Routes & string]
    >
  : never;

export type BuildClientChain<T> = {
  [K in keyof T]: K extends "$get" | "$post" | "$put" | "$patch" | "$delete" | "$options" | "$head"
    ? ClientMethodFn<T[K]>
    : BuildClientChain<T[K]>;
};

type RegisteredClientChain = import("@taserjs/router").RouterRegister extends {
  ClientChain: infer C;
}
  ? [C] extends [never]
    ? never
    : BuildClientChain<C>
  : never;

type FallbackClient<TApp> =
  InferAppManifest<TApp> extends infer Manifest
    ? Manifest extends RouteManifestShape
      ? ClientFromRoutes<Manifest>
      : never
    : never;

export type Client<TApp = never> = [TApp] extends [never]
  ? [RegisteredClientChain] extends [never]
    ? Record<string, any>
    : RegisteredClientChain
  : FallbackClient<TApp>;

export type InferRequestType<T> = T extends (
  args: infer R,
  options?: ClientRequestOptions,
) => Promise<ClientResponse<unknown>>
  ? R
  : T extends (args?: infer R, options?: ClientRequestOptions) => Promise<ClientResponse<unknown>>
    ? R
    : never;

export type InferResponseType<T> = T extends (...args: never[]) => Promise<ClientResponse<infer O>>
  ? O
  : never;

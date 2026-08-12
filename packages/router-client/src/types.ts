import type {
  InferAppManifest,
  InferOutput,
  ReturnsMap,
  RouteManifestShape,
  Schema,
  Simplify,
  SuccessReplyData,
} from '@taserjs/router'

import type { FormBody, FormBodyField, FormBodyInput } from './form-body.js'
import type { HttpMethodName } from './constants/methods.js'

export type { HttpMethodName }

export type OpenQuery = Record<string, string | number | boolean | string[]>

/** Schema-defined query fields plus any additional open query keys. */
export type QueryWithOpen<T> = Simplify<T & OpenQuery>

export type ClientRequestOptions = {
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>)
  fetch?: typeof fetch
  init?: RequestInit
}

export type CreateClientOptions = {
  baseUrl: string
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>)
  fetch?: typeof fetch
}

type RequiredKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K
}[keyof T]

type HasRequiredKeys<T> = [RequiredKeys<T>] extends [never] ? false : true

type RouteInput<Route> = Route extends { $Infer: { Input: infer I } } ? I : {}

type QueryArg<T> = HasRequiredKeys<T> extends true
  ? { query: QueryWithOpen<T> }
  : { query?: QueryWithOpen<T> }

type RequiredParam<T> = HasRequiredKeys<T> extends true ? { param: T } : {}

type BodyArg<T> = T extends FormData
  ? { body: FormData | FormBody<Record<string, FormBodyField>> }
  : T extends Record<string, FormBodyField>
    ? { body: FormBodyInput<T> }
    : { body: T }

type InputToClientArgs<I> = Simplify<
  & (I extends { query: infer Q } ? QueryArg<Q> : { query?: OpenQuery })
  & (I extends { params: infer P } ? RequiredParam<P> : {})
  & (I extends { body: infer B } ? BodyArg<B> : {})
>

type ClientArgsFor<
  Entry,
> = Entry extends { route: infer Route }
  ? InputToClientArgs<RouteInput<Route>>
  : {}

type ClientMethodReturn<Entry> = Promise<
  ClientResponse<
    Entry extends { route: infer Route } ? OkJsonOutput<Route> : unknown
  >
>

type InferredSuccessJson<Route> = Route extends { $Infer: { Output: infer O } }
  ? [SuccessReplyData<O>] extends [never]
      ? unknown
      : SuccessReplyData<O>
  : unknown

/** Prefer `returns[200]` schema; else union of success `ReplyOf` bodies from `$Infer.Output`. */
type OkJsonOutput<Route> = Route extends { returns?: infer R }
  ? R extends ReturnsMap
    ? 200 extends keyof R
      ? R[200] extends Schema<unknown>
        ? InferOutput<R[200]>
        : InferredSuccessJson<Route>
      : InferredSuccessJson<Route>
    : InferredSuccessJson<Route>
  : InferredSuccessJson<Route>

export type ClientResponse<TJson = unknown> = Omit<Response, 'json'> & {
  json(): Promise<TJson>
}

type MethodToClientKey = {
  GET: '$get'
  POST: '$post'
  PUT: '$put'
  PATCH: '$patch'
  DELETE: '$delete'
  OPTIONS: '$options'
  HEAD: '$head'
}

type ClientMethodFn<
  _Path extends string,
  _Method extends string,
  Entry,
> = HasRequiredKeys<ClientArgsFor<Entry>> extends true
  ? (
      args: ClientArgsFor<Entry>,
      options?: ClientRequestOptions,
    ) => ClientMethodReturn<Entry>
  : (
      args?: ClientArgsFor<Entry>,
      options?: ClientRequestOptions,
    ) => ClientMethodReturn<Entry>

type ClientMethodsForPath<
  Path extends string,
  Methods,
> = {
  [M in keyof Methods & HttpMethodName as MethodToClientKey[M]]: ClientMethodFn<
    Path,
    M,
    Methods[M]
  >
}

type SegmentKey<Segment extends string>
  = Segment extends `:${infer Name}`
    ? `_${Name}`
    : Segment extends '*'
      ? '_splat'
      : Segment extends ''
        ? 'index'
        : Segment

type PathToChain<
  Path extends string,
  Methods,
  Remaining extends string = Path extends `/${infer R}` ? R : Path,
> = Remaining extends `${infer Segment}/${infer Rest}`
  ? { [K in SegmentKey<Segment>]: PathToChain<Path, Methods, Rest> }
  : {
      [K in SegmentKey<Remaining>]: ClientMethodsForPath<Path, Methods>
    }

type UnionToIntersection<U>
  = (U extends unknown ? (value: U) => void : never) extends (value: infer I) => void
    ? I
    : never

type ClientFromRoutes<Manifest extends RouteManifestShape>
  = Manifest extends { routes: infer Routes }
    ? UnionToIntersection<
      {
        [Path in keyof Routes & string]: PathToChain<
          Path,
          Routes[Path]
        >
      }[keyof Routes & string]
    >
    : never

export type Client<TApp> = InferAppManifest<TApp> extends infer Manifest
  ? Manifest extends RouteManifestShape
    ? Simplify<ClientFromRoutes<Manifest>>
    : never
  : never

export type InferRequestType<T>
  = T extends (args: infer R, options?: ClientRequestOptions) => Promise<ClientResponse<unknown>>
    ? R
    : T extends (args?: infer R, options?: ClientRequestOptions) => Promise<ClientResponse<unknown>>
      ? R
      : never

export type InferResponseType<T>
  = T extends (...args: never[]) => Promise<ClientResponse<infer O>>
    ? O
    : never

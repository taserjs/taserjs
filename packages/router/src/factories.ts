import { createRouteBuilder } from "./route.js";
import type { RouteBuilder, RoutePath, Schema } from "./types/index.js";
import type { AppContext, HttpMethod } from "./types/units.js";

type WithoutBodyOptions<TQuery, TParams, TQueryIn = unknown, TParamsIn = unknown> = {
  query?: Schema<TQuery, TQueryIn>;
  params?: Schema<TParams, TParamsIn>;
};

type WithBodyOptions<
  TQuery,
  TParams,
  TBody,
  TQueryIn = unknown,
  TParamsIn = unknown,
  TBodyIn = unknown,
> = WithoutBodyOptions<TQuery, TParams, TQueryIn, TParamsIn> & {
  body?: Schema<TBody, TBodyIn>;
};

export type CreateWithoutBodyRoute<
  M extends "GET" | "DELETE" | "OPTIONS" | "HEAD",
  TAppContext extends Record<string, unknown> = AppContext,
> = {
  <const Path extends RoutePath>(
    path: Path,
  ): RouteBuilder<Path, M, readonly [], {}, {}, TAppContext>;
  <
    const Path extends RoutePath,
    TQuery = unknown,
    TParams = unknown,
    TQueryIn = unknown,
    TParamsIn = unknown,
  >(
    path: Path,
    options: WithoutBodyOptions<TQuery, TParams, TQueryIn, TParamsIn>,
  ): RouteBuilder<
    Path,
    M,
    readonly [],
    {
      query: TQuery;
      params: TParams;
      queryIn: TQueryIn;
      paramsIn: TParamsIn;
    },
    {},
    TAppContext
  >;
};

export type CreateWithBodyRoute<
  M extends "POST" | "PUT" | "PATCH",
  TAppContext extends Record<string, unknown> = AppContext,
> = {
  <const Path extends RoutePath>(
    path: Path,
  ): RouteBuilder<Path, M, readonly [], {}, {}, TAppContext>;
  <
    const Path extends RoutePath,
    TQuery = unknown,
    TParams = unknown,
    TBody = unknown,
    TQueryIn = unknown,
    TParamsIn = unknown,
    TBodyIn = unknown,
  >(
    path: Path,
    options: WithBodyOptions<TQuery, TParams, TBody, TQueryIn, TParamsIn, TBodyIn>,
  ): RouteBuilder<
    Path,
    M,
    readonly [],
    {
      query: TQuery;
      params: TParams;
      body: TBody;
      queryIn: TQueryIn;
      paramsIn: TParamsIn;
      bodyIn: TBodyIn;
    },
    {},
    TAppContext
  >;
};

export type CreateAnyRoute<TAppContext extends Record<string, unknown> = AppContext> = {
  <const Path extends RoutePath, const Methods extends readonly HttpMethod[]>(
    path: Path,
    methods: Methods,
  ): RouteBuilder<Path, Methods[number], readonly [], {}, {}, TAppContext>;
  <
    const Path extends RoutePath,
    const Methods extends readonly HttpMethod[],
    TQuery = unknown,
    TParams = unknown,
    TBody = unknown,
    TQueryIn = unknown,
    TParamsIn = unknown,
    TBodyIn = unknown,
  >(
    path: Path,
    methods: Methods,
    options: WithBodyOptions<TQuery, TParams, TBody, TQueryIn, TParamsIn, TBodyIn>,
  ): RouteBuilder<
    Path,
    Methods[number],
    readonly [],
    {
      query: TQuery;
      params: TParams;
      body: TBody;
      queryIn: TQueryIn;
      paramsIn: TParamsIn;
      bodyIn: TBodyIn;
    },
    {},
    TAppContext
  >;
};

export type CreateAllRoute<TAppContext extends Record<string, unknown> = AppContext> = {
  <const Path extends RoutePath>(
    path: Path,
  ): RouteBuilder<Path, HttpMethod, readonly [], {}, {}, TAppContext>;
  <
    const Path extends RoutePath,
    TQuery = unknown,
    TParams = unknown,
    TBody = unknown,
    TQueryIn = unknown,
    TParamsIn = unknown,
    TBodyIn = unknown,
  >(
    path: Path,
    options: WithBodyOptions<TQuery, TParams, TBody, TQueryIn, TParamsIn, TBodyIn>,
  ): RouteBuilder<
    Path,
    HttpMethod,
    readonly [],
    {
      query: TQuery;
      params: TParams;
      body: TBody;
      queryIn: TQueryIn;
      paramsIn: TParamsIn;
      bodyIn: TBodyIn;
    },
    {},
    TAppContext
  >;
};

function createWithoutBodyRoute<M extends "GET" | "DELETE" | "OPTIONS" | "HEAD">(
  method: M,
): CreateWithoutBodyRoute<M> {
  return ((path: string, options?: WithoutBodyOptions<unknown, unknown>) =>
    createRouteBuilder(path, method, options)) as unknown as CreateWithoutBodyRoute<M>;
}

function createWithBodyRoute<M extends "POST" | "PUT" | "PATCH">(
  method: M,
): CreateWithBodyRoute<M> {
  return ((path: string, options?: WithBodyOptions<unknown, unknown, unknown>) =>
    createRouteBuilder(path, method, options)) as unknown as CreateWithBodyRoute<M>;
}

export const createGetRoute = createWithoutBodyRoute("GET");
export const createDeleteRoute = createWithoutBodyRoute("DELETE");
export const createOptionsRoute = createWithoutBodyRoute("OPTIONS");
export const createHeadRoute = createWithoutBodyRoute("HEAD");
export const createPostRoute = createWithBodyRoute("POST");
export const createPutRoute = createWithBodyRoute("PUT");
export const createPatchRoute = createWithBodyRoute("PATCH");

export const createAnyRoute: CreateAnyRoute = ((
  path: string,
  methods: readonly HttpMethod[],
  options?: WithBodyOptions<unknown, unknown, unknown>,
) => createRouteBuilder(path, "ANY", options, methods)) as unknown as CreateAnyRoute;

export const createAllRoute: CreateAllRoute = ((
  path: string,
  options?: WithBodyOptions<unknown, unknown, unknown>,
) => createRouteBuilder(path, "ALL", options)) as unknown as CreateAllRoute;

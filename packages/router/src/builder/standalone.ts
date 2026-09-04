import type { AppContext, LayoutBuilder, RouteBuilder, RoutePath } from "../types/index.js";
import type { HttpMethod } from "../types/units.js";
import { createRouteBuilder } from "./route.js";
import { createMiddleware } from "./middleware.js";
import { middleware as createMiddlewareFn, type MiddlewareFn } from "../define/middleware.js";

export type CreateWithoutBodyRoute<
  M extends "GET" | "DELETE" | "OPTIONS" | "HEAD",
  TAppContext extends Record<string, unknown> = AppContext,
> = <const Path extends RoutePath>(
  path: Path,
) => RouteBuilder<Path, M, readonly [], {}, {}, TAppContext>;

export type CreateWithBodyRoute<
  M extends "POST" | "PUT" | "PATCH" | "QUERY",
  TAppContext extends Record<string, unknown> = AppContext,
> = <const Path extends RoutePath>(
  path: Path,
) => RouteBuilder<Path, M, readonly [], {}, {}, TAppContext>;

export type CreateAnyRoute<TAppContext extends Record<string, unknown> = AppContext> = <
  const Path extends RoutePath,
  const Methods extends readonly HttpMethod[],
>(
  path: Path,
  methods: Methods,
) => RouteBuilder<Path, Methods[number], readonly [], {}, {}, TAppContext>;

export type CreateAllRoute<TAppContext extends Record<string, unknown> = AppContext> = <
  const Path extends RoutePath,
>(
  path: Path,
) => RouteBuilder<Path, HttpMethod, readonly [], {}, {}, TAppContext>;

function createWithoutBodyRoute<M extends "GET" | "DELETE" | "OPTIONS" | "HEAD">(
  method: M,
): CreateWithoutBodyRoute<M> {
  return ((path: string) =>
    createRouteBuilder(path, method)) as unknown as CreateWithoutBodyRoute<M>;
}

function createWithBodyRoute<M extends "POST" | "PUT" | "PATCH" | "QUERY">(
  method: M,
): CreateWithBodyRoute<M> {
  return ((path: string) => createRouteBuilder(path, method)) as unknown as CreateWithBodyRoute<M>;
}

export type TaserNamespace<TAppContext extends Record<string, unknown> = AppContext> = {
  readonly get: CreateWithoutBodyRoute<"GET", TAppContext>;
  readonly post: CreateWithBodyRoute<"POST", TAppContext>;
  readonly put: CreateWithBodyRoute<"PUT", TAppContext>;
  readonly patch: CreateWithBodyRoute<"PATCH", TAppContext>;
  readonly delete: CreateWithoutBodyRoute<"DELETE", TAppContext>;
  readonly options: CreateWithoutBodyRoute<"OPTIONS", TAppContext>;
  readonly head: CreateWithoutBodyRoute<"HEAD", TAppContext>;
  readonly query: CreateWithBodyRoute<"QUERY", TAppContext>;
  readonly any: CreateAnyRoute<TAppContext>;
  readonly all: CreateAllRoute<TAppContext>;
  readonly layout: LayoutBuilder<TAppContext>;
  readonly middleware: MiddlewareFn<TAppContext>;
};

export const middleware: MiddlewareFn<AppContext> = createMiddlewareFn as MiddlewareFn<AppContext>;

export const t: TaserNamespace<AppContext> = {
  get: createWithoutBodyRoute("GET"),
  post: createWithBodyRoute("POST"),
  put: createWithBodyRoute("PUT"),
  patch: createWithBodyRoute("PATCH"),
  delete: createWithoutBodyRoute("DELETE"),
  options: createWithoutBodyRoute("OPTIONS"),
  head: createWithoutBodyRoute("HEAD"),
  query: createWithBodyRoute("QUERY"),
  any: ((path: string, methods: readonly HttpMethod[]) =>
    createRouteBuilder(path, "ANY", methods)) as unknown as CreateAnyRoute<AppContext>,
  all: ((path: string) => createRouteBuilder(path, "ALL")) as unknown as CreateAllRoute<AppContext>,
  layout: createMiddleware as LayoutBuilder<AppContext>,
  middleware,
};

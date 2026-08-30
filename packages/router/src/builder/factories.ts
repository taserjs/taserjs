import { createRouteBuilder } from "./route.js";
import type { AppContext, RouteBuilder, RoutePath } from "../types/index.js";
import type { HttpMethod } from "../types/units.js";

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

export const createGetRoute = createWithoutBodyRoute("GET");
export const createDeleteRoute = createWithoutBodyRoute("DELETE");
export const createOptionsRoute = createWithoutBodyRoute("OPTIONS");
export const createHeadRoute = createWithoutBodyRoute("HEAD");
export const createPostRoute = createWithBodyRoute("POST");
export const createPutRoute = createWithBodyRoute("PUT");
export const createPatchRoute = createWithBodyRoute("PATCH");
export const createQueryRoute = createWithBodyRoute("QUERY");

export const createAnyRoute: CreateAnyRoute = ((path: string, methods: readonly HttpMethod[]) =>
  createRouteBuilder(path, "ANY", methods)) as unknown as CreateAnyRoute;

export const createAllRoute: CreateAllRoute = ((path: string) =>
  createRouteBuilder(path, "ALL")) as unknown as CreateAllRoute;

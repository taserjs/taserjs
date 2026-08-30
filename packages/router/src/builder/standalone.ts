import type { AppContext, LayoutBuilder } from "../types/index.js";
import {
  createAllRoute,
  createAnyRoute,
  createDeleteRoute,
  createGetRoute,
  createHeadRoute,
  createOptionsRoute,
  createPatchRoute,
  createPostRoute,
  createPutRoute,
  createQueryRoute,
  type CreateAllRoute,
  type CreateAnyRoute,
  type CreateWithBodyRoute,
  type CreateWithoutBodyRoute,
} from "./factories.js";
import { createMiddleware } from "./middleware.js";
import { middleware as createMiddlewareFn, type MiddlewareFn } from "../define/middleware.js";

export const get: CreateWithoutBodyRoute<"GET", AppContext> =
  createGetRoute as CreateWithoutBodyRoute<"GET", AppContext>;
export const post: CreateWithBodyRoute<"POST", AppContext> = createPostRoute as CreateWithBodyRoute<
  "POST",
  AppContext
>;
export const put: CreateWithBodyRoute<"PUT", AppContext> = createPutRoute as CreateWithBodyRoute<
  "PUT",
  AppContext
>;
export const patch: CreateWithBodyRoute<"PATCH", AppContext> =
  createPatchRoute as CreateWithBodyRoute<"PATCH", AppContext>;
export const del: CreateWithoutBodyRoute<"DELETE", AppContext> =
  createDeleteRoute as CreateWithoutBodyRoute<"DELETE", AppContext>;
export const options: CreateWithoutBodyRoute<"OPTIONS", AppContext> =
  createOptionsRoute as CreateWithoutBodyRoute<"OPTIONS", AppContext>;
export const head: CreateWithoutBodyRoute<"HEAD", AppContext> =
  createHeadRoute as CreateWithoutBodyRoute<"HEAD", AppContext>;
export const query: CreateWithBodyRoute<"QUERY", AppContext> =
  createQueryRoute as CreateWithBodyRoute<"QUERY", AppContext>;
export const any: CreateAnyRoute<AppContext> = createAnyRoute as CreateAnyRoute<AppContext>;
export const all: CreateAllRoute<AppContext> = createAllRoute as CreateAllRoute<AppContext>;

export const layout: LayoutBuilder<AppContext> = createMiddleware as LayoutBuilder<AppContext>;
export const middleware: MiddlewareFn<AppContext> = createMiddlewareFn as MiddlewareFn<AppContext>;

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

export const t: TaserNamespace<AppContext> = {
  get,
  post,
  put,
  patch,
  delete: del,
  options,
  head,
  query,
  any,
  all,
  layout,
  middleware,
};

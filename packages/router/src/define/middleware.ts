import { type Awaitable } from "@taserjs/router-core";

import { createMiddlewareUnitBuilder } from "../builder/middleware-unit.js";
import type {
  AppContext,
  DefineMiddlewareResult,
  ExtractState,
  IsUnknown,
  MiddlewareUnitBuilder,
  NextFn,
  StandaloneMiddlewareContext,
} from "../types/units.js";
import type {
  LayoutId,
  ResolveLayoutMiddlewaresState,
  ResolveLayoutsState,
} from "../types/index.js";

export interface DefineMiddlewareFn<TAppContext extends Record<string, unknown> = AppContext> {
  /**
   * Constructs a fluent unscoped middleware builder.
   *
   * @example
   * ```ts
   * const auth = defineMiddleware()
   *   .query(z.object({ token: z.string() }))
   *   .body("form", z.object({ file: z.instanceof(File) }))
   *   .returns({ 401: z.string() })
   *   .handler(async (ctx, next) => next({ user: "alice" }));
   * ```
   */
  (): MiddlewareUnitBuilder<unknown, unknown, unknown, {}, null, {}, TAppContext>;

  /**
   * Constructs a fluent middleware builder scoped to a single layout branch.
   */
  <const Layout extends LayoutId>(
    layout: Layout,
  ): MiddlewareUnitBuilder<
    unknown,
    unknown,
    unknown,
    {},
    Layout,
    {},
    TAppContext,
    ResolveLayoutMiddlewaresState<Layout>
  >;

  /**
   * Constructs a fluent middleware builder scoped to multiple layout branches (branch union).
   */
  <const Layouts extends readonly [LayoutId, ...LayoutId[]]>(
    layouts: Layouts,
  ): MiddlewareUnitBuilder<
    unknown,
    unknown,
    unknown,
    {},
    Layouts,
    {},
    TAppContext,
    ResolveLayoutsState<Layouts>
  >;

  /**
   * Defines a standalone middleware scoped to a single layout branch using a short function signature.
   */
  <const Layout extends LayoutId, TState = unknown, TRequires = {}, R = unknown>(
    layout: Layout,
    fn: (
      ctx: StandaloneMiddlewareContext<
        unknown,
        unknown,
        unknown,
        TAppContext,
        ResolveLayoutMiddlewaresState<Layout> & TRequires
      >,
      next: NextFn<NoInfer<TState>>,
    ) => Awaitable<R>,
  ): DefineMiddlewareResult<
    unknown,
    unknown,
    unknown,
    IsUnknown<TState> extends true ? ExtractState<R> : TState,
    R,
    unknown,
    unknown,
    unknown,
    {},
    Layout,
    TRequires
  >;

  /**
   * Defines a standalone middleware scoped to multiple layout branches using a short function signature.
   */
  <
    const Layouts extends readonly [LayoutId, ...LayoutId[]],
    TState = unknown,
    TRequires = {},
    R = unknown,
  >(
    layouts: Layouts,
    fn: (
      ctx: StandaloneMiddlewareContext<
        unknown,
        unknown,
        unknown,
        TAppContext,
        ResolveLayoutsState<Layouts> & TRequires
      >,
      next: NextFn<NoInfer<TState>>,
    ) => Awaitable<R>,
  ): DefineMiddlewareResult<
    unknown,
    unknown,
    unknown,
    IsUnknown<TState> extends true ? ExtractState<R> : TState,
    R,
    unknown,
    unknown,
    unknown,
    {},
    Layouts,
    TRequires
  >;

  /**
   * Defines a standalone, unscoped middleware using a short function signature.
   *
   * @example
   * ```ts
   * const auth = defineMiddleware((ctx, next) => {
   *   return next({ user: "alice" });
   * });
   * ```
   */
  <TState = unknown, TRequires = {}, R = unknown>(
    fn: (
      ctx: StandaloneMiddlewareContext<unknown, unknown, unknown, TAppContext, TRequires>,
      next: NextFn<NoInfer<TState>>,
    ) => Awaitable<R>,
  ): DefineMiddlewareResult<
    unknown,
    unknown,
    unknown,
    IsUnknown<TState> extends true ? ExtractState<R> : TState,
    R,
    unknown,
    unknown,
    unknown,
    {},
    null,
    TRequires
  >;
}

export const defineMiddleware: DefineMiddlewareFn<AppContext> = function defineMiddleware(
  first?: any,
  second?: any,
): any {
  if (first === undefined) {
    return createMiddlewareUnitBuilder();
  }

  if (typeof first === "string" || Array.isArray(first)) {
    if (typeof second === "function") {
      return {
        handler: second,
        __middlewareAcc: undefined as unknown,
        __requiredLayouts: first,
      };
    }
    return createMiddlewareUnitBuilder(first);
  }

  if (typeof first === "function") {
    return {
      handler: first,
      __middlewareAcc: undefined as unknown,
    };
  }

  return createMiddlewareUnitBuilder();
};

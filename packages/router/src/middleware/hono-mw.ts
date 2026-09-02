import { createTaserCompatHandler } from "@taserjs/router-core";
import type { MiddlewareHandler } from "hono";

import type { NextFn } from "../types/units.js";

/**
 * Adapts a standard Web / Hono-compatible middleware function `(c, next) => ...`
 * into a Taser-compatible middleware handler function `(ctx, next) => Promise<Response>`.
 *
 * @example
 * ```ts
 * import { honoMw } from "@taserjs/router";
 * import { cors } from "hono/cors";
 *
 * const app = t.get("/hello").use(honoMw(cors()));
 * // or
 * const customCors = middleware(honoMw(cors()));
 * ```
 */
export function honoMw<TState extends Record<string, unknown> = {}>(
  middleware: MiddlewareHandler,
): (ctx: unknown, next: NextFn<TState>) => Promise<Response> {
  return createTaserCompatHandler(middleware) as (
    ctx: unknown,
    next: NextFn<TState>,
  ) => Promise<Response>;
}

import { createTaserCompatHandler } from "@taserjs/router-core";
import type { MiddlewareHandler } from "hono";

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
export function honoMw(
  middleware: MiddlewareHandler,
): (ctx: unknown, next: any) => Promise<Response> {
  return createTaserCompatHandler(middleware) as (ctx: unknown, next: any) => Promise<Response>;
}

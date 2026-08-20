import { createTaserCompatHandler } from "@taserjs/router-core";
import type { MiddlewareHandler } from "hono";

import { defineMiddleware } from "../define/middleware.js";
import type { MiddlewareReturnFromParts, MiddlewareUnit } from "../types/units.js";

export function wrapHonoMiddleware<F extends (...args: never[]) => MiddlewareHandler>(
  honoFactory: F,
): (
  ...args: Parameters<F>
) => MiddlewareUnit<MiddlewareReturnFromParts<unknown, unknown, unknown, {}>> {
  return (...args) => defineMiddleware(honoFactory(...args));
}

/** Extracts the jwtPayload from Hono's variable bag and forwards it into Taser's state via next(). */
export function extractJwtPayload<TPayload>(
  honoMw: MiddlewareHandler,
): (ctx: unknown, next: (state: { jwtPayload: TPayload }) => unknown) => unknown {
  const taserHandler = createTaserCompatHandler(honoMw);
  return (ctx, next) =>
    taserHandler(ctx, async () => {
      const payload = (ctx as unknown as { var: { jwtPayload?: unknown } }).var.jwtPayload;
      return next({ jwtPayload: payload as TPayload });
    });
}

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

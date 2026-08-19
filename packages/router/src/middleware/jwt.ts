import { createTaserCompatHandler } from "@taserjs/router-core";
import type { MiddlewareHandler } from "hono";
import { jwt as honoJwt } from "hono/jwt";

import { defineMiddleware } from "../define/middleware.js";
import type { MiddlewareReturnFromParts, MiddlewareUnit } from "../types/units.js";

export type JwtPayloadState<TPayload> = {
  jwtPayload: TPayload;
};

export type JwtMiddlewareUnit<TPayload> = MiddlewareUnit<
  MiddlewareReturnFromParts<unknown, unknown, unknown, JwtPayloadState<TPayload>>
>;

export type JwtOptions = Parameters<typeof honoJwt>[0];

/**
 * JWT auth middleware. Invalid or missing tokens return **401** (Hono).
 * Successfully decoded payload is placed in `ctx.state.jwtPayload`.
 */
export function jwt<TPayload = Record<string, unknown>>(
  options: JwtOptions,
): JwtMiddlewareUnit<TPayload> {
  const honoMw: MiddlewareHandler = honoJwt(options);
  return defineMiddleware<JwtPayloadState<TPayload>>({
    handler: (ctx, next) => {
      return createTaserCompatHandler(honoMw)(ctx, async () => {
        const payload = (ctx as unknown as { var: { jwtPayload?: unknown } }).var.jwtPayload;
        return next({ jwtPayload: payload as TPayload });
      });
    },
  });
}

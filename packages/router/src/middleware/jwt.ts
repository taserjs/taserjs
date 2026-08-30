import { jwt as honoJwt } from "hono/jwt";

import { middleware } from "../define/middleware.js";
import type { MiddlewareReturnFromParts, MiddlewareUnit } from "../types/units.js";
import { honoMw } from "./hono-mw.js";

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
  const mw = honoMw(honoJwt(options));
  return middleware<JwtPayloadState<TPayload>>((ctx, next) =>
    mw(ctx, async () => {
      const payload = (ctx as unknown as { var: { jwtPayload?: unknown } }).var.jwtPayload;
      return next({ jwtPayload: payload as TPayload });
    }),
  );
}

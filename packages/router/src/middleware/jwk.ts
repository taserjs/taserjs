import { jwk as honoJwk } from "hono/jwk";
import { hono } from "../hono.js";
import type { MiddlewareDefinition } from "../types.js";

export type JWKOptions = Parameters<typeof honoJwk>[0];

export function jwk<TClaims = Record<string, unknown>>(
  options: JWKOptions,
  init?: RequestInit,
): MiddlewareDefinition<unknown, { jwtPayload: TClaims }, unknown, unknown, unknown> {
  const honoMw = honoJwk(options, init);

  return hono(honoMw, (c, next) => {
    const jwtPayload = c.get("jwtPayload") as TClaims;
    return next({ jwtPayload });
  });
}

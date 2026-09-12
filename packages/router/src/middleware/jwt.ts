import { jwt as honoJwt, sign, verify, decode, verifyWithJwks, AlgorithmTypes } from "hono/jwt";
import { hono } from "../hono.js";
import type { MiddlewareDefinition } from "../types.js";

export type HonoJWTOptions = Parameters<typeof honoJwt>[0];

export interface JWTOptions extends Omit<HonoJWTOptions, "alg"> {
  alg?: HonoJWTOptions["alg"];
}

export function jwt<TClaims = Record<string, unknown>>(
  options: JWTOptions,
): MiddlewareDefinition<unknown, { jwtPayload: TClaims }, unknown, unknown, unknown> {
  const { alg = "HS256", ...rest } = options;
  const honoMw = honoJwt({
    alg,
    ...rest,
  });

  return hono(honoMw, (c, next) => {
    const jwtPayload = c.get("jwtPayload") as TClaims;
    return next({ jwtPayload });
  });
}

export { sign, verify, decode, verifyWithJwks, AlgorithmTypes };

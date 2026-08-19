import { createTaserCompatHandler } from "@taserjs/router-core";
import type { MiddlewareHandler } from "hono";
import { jwk as honoJwk } from "hono/jwk";

import { defineMiddleware } from "../define/middleware.js";
import type { JwtMiddlewareUnit, JwtPayloadState } from "./jwt.js";

export type JwkOptions = Parameters<typeof honoJwk>[0];

export type JwkRequestInit = Pick<RequestInit, "headers">;

export type JwkMiddlewareOptions = JwkOptions & {
  /** Allow `http://` JWKS URLs (local dev). Default false — requires `https://`. */
  allowInsecure?: boolean;
};

function assertJwksScheme(jwksUri: string, allowInsecure: boolean): void {
  const scheme = new URL(jwksUri).protocol.replace(":", "");
  if (scheme === "https") {
    return;
  }
  if (scheme === "http" && allowInsecure) {
    return;
  }
  throw new Error(`JWKS URL must use https:// (or http:// with allowInsecure: true): "${jwksUri}"`);
}

/**
 * JWK auth middleware. Invalid or missing tokens return **401** (Hono).
 * Successfully decoded payload is placed in `ctx.state.jwtPayload`.
 * Static `jwks_uri` must use HTTPS unless `allowInsecure: true`.
 */
export function jwk<TPayload = Record<string, unknown>>(
  options: JwkMiddlewareOptions,
  init?: JwkRequestInit,
): JwtMiddlewareUnit<TPayload> {
  const jwksUri = options.jwks_uri;
  if (typeof jwksUri === "string") {
    assertJwksScheme(jwksUri, options.allowInsecure ?? false);
  }

  const { allowInsecure: _allowInsecure, ...honoOptions } = options;
  const safeInit = init?.headers !== undefined ? { headers: init.headers } : undefined;
  const honoMw: MiddlewareHandler = honoJwk(honoOptions, safeInit);

  return defineMiddleware<JwtPayloadState<TPayload>>({
    handler: (ctx, next) => {
      return createTaserCompatHandler(honoMw)(ctx, async () => {
        const payload = (ctx as unknown as { var: { jwtPayload?: unknown } }).var.jwtPayload;
        return next({ jwtPayload: payload as TPayload });
      });
    },
  });
}

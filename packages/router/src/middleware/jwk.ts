import { jwk as honoJwk } from "hono/jwk";

import { createAuthMiddleware, type AuthMiddlewareUnit } from "./auth.js";
import type { InferOutput, Schema } from "../types/schema.js";

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
 * Valid tokens whose payload fails `payloadSchema` return **403**.
 * Static `jwks_uri` must use HTTPS unless `allowInsecure: true`.
 */
export function jwk<TPayload>(
  payloadSchema: Schema<TPayload>,
  options: JwkMiddlewareOptions,
  init?: JwkRequestInit,
): AuthMiddlewareUnit<InferOutput<Schema<TPayload>>> {
  const jwksUri = options.jwks_uri;
  if (typeof jwksUri === "string") {
    assertJwksScheme(jwksUri, options.allowInsecure ?? false);
  }

  const { allowInsecure: _allowInsecure, ...honoOptions } = options;
  const safeInit = init?.headers !== undefined ? { headers: init.headers } : undefined;

  return createAuthMiddleware(payloadSchema, honoJwk(honoOptions, safeInit));
}
